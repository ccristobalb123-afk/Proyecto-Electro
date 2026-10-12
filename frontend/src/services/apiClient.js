// ============================================================
// apiClient — capa base de comunicación con el backend.
//
// Ningún componente ni página debería usar `fetch` directamente.
// Todos los services (auth, equipos, facturas, etc.) pasan por acá,
// así que cuando el backend real exista, solo hay que:
//   1) definir VITE_API_URL en el .env
//   2) apagar el modo mock (MOCK_MODE) en cada service
// y ninguna página necesita cambiar una sola línea.
// ============================================================

export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Ninguna petición puede quedarse esperando para siempre: con señal
// débil, el navegador puede tardar minutos en rendirse y la pantalla
// parece congelada. Pasado este tiempo se corta con un mensaje claro.
const TIEMPO_LIMITE_MS = 30_000;
export const MENSAJE_TIEMPO_AGOTADO =
  "El servidor está tardando demasiado en responder. Revisa tu conexión e inténtalo de nuevo.";

// Combina la señal de quien llama (cancelar a propósito) con el tiempo
// límite, y permite saber después cuál de las dos cortó la petición.
function conTiempoLimite(signalExterna, ms = TIEMPO_LIMITE_MS) {
  const controller = new AbortController();
  let expiro = false;
  const timer = setTimeout(() => {
    expiro = true;
    controller.abort();
  }, ms);
  const alCancelar = () => controller.abort();
  if (signalExterna?.aborted) controller.abort();
  signalExterna?.addEventListener("abort", alCancelar);
  return {
    signal: controller.signal,
    expiro: () => expiro,
    limpiar: () => {
      clearTimeout(timer);
      signalExterna?.removeEventListener("abort", alCancelar);
    },
  };
}

/** Simula la latencia de red en modo mock, para que la UI ya
 * contemple estados de "cargando" reales desde ahora. */
export function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Error uniforme para toda la app. `code` es estable y sirve para
 * lógica de negocio (ej. `if (err.code === "SESION_EXPIRADA")`),
 * `message` es el texto ya listo para mostrarle al usuario.
 */
export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

// ---- Aviso global de "sesión expirada" ----
// El AuthContext se suscribe a esto para poder limpiar la sesión y
// redirigir al login sin que apiClient necesite importar el contexto
// (evita una dependencia circular services <-> context).
const listenersSesionExpirada = new Set();
export function onSesionExpirada(callback) {
  listenersSesionExpirada.add(callback);
  return () => listenersSesionExpirada.delete(callback);
}
export function avisarSesionExpirada() {
  listenersSesionExpirada.forEach((cb) => cb());
}

// ---- Renovación automática del access token ----
// El access token dura poco a propósito (15 min) por seguridad — pero
// eso no debería significar que la sesión se corte cada 15 min. Antes
// de avisar "sesión expirada", se intenta renovar en silencio con el
// refresh token (que dura mucho más) y reintentar el pedido original
// UNA vez. Si varios pedidos fallan al mismo tiempo (ej. el Dashboard
// dispara 4 en paralelo justo cuando el token vence), todos comparten
// el mismo intento de renovación en vez de disparar 4 refrescos a la
// vez.
let renovacionEnCurso = null;
export async function intentarRenovarSesion() {
  if (!renovacionEnCurso) {
    renovacionEnCurso = fetch(new URL(BASE_URL + "/auth/refresh", window.location.origin), {
      method: "POST",
      credentials: "include",
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        renovacionEnCurso = null;
      });
  }
  return renovacionEnCurso;
}

// La cookie de acceso vence a los 15 min junto con el token, así que
// pasado ese tiempo el navegador directamente deja de enviarla y el
// backend responde NO_AUTENTICADO (no SESION_EXPIRADA). Antes solo se
// renovaba ante SESION_EXPIRADA, por lo que todo pedido hecho después
// de los 15 min fallaba sin intentar el refresh token. Se excluyen las
// rutas públicas de auth (login, MFA, refresh...): ahí un 401 es una
// respuesta normal, no una sesión vencida. /auth/me sí renueva — así
// un F5 después de 15 min recupera la sesión en vez de pedir login.
function puedeRenovar(path, code) {
  if (code === "SESION_EXPIRADA") return true;
  if (code !== "NO_AUTENTICADO") return false;
  return !path.startsWith("/auth/") || path === "/auth/me" || path === "/auth/cambiar-password";
}

// Se avisa "sesión expirada" (limpia la sesión y manda al login) solo
// si de verdad había una — un /auth/me sin sesión al abrir la app es
// la situación normal de cualquiera que no inició sesión todavía.
function debeAvisarExpiracion(path, code) {
  return code === "SESION_EXPIRADA" || (code === "NO_AUTENTICADO" && path !== "/auth/me" && puedeRenovar(path, code));
}

async function codigoDeError(respuesta) {
  try {
    const json = await respuesta.clone().json();
    return json?.error?.code;
  } catch {
    return undefined;
  }
}

/**
 * fetch con la cookie de sesión y la misma renovación automática que
 * apiRequest, pero devolviendo la Response cruda — para lo que no es
 * JSON: subir archivos (FormData) y descargar archivos protegidos
 * (fotos/PDFs de /api/uploads) como blob. `path` es relativo a la API
 * ("/uploads") o una URL ya armada con "/api" ("/api/uploads/x.pdf").
 */
export async function fetchConSesion(path, init = {}) {
  // archivoUrl llega como "/api/uploads/x": se le quita el "/api" y se
  // usa BASE_URL, que puede ser "/api", "/API" o una URL completa.
  const pathApi = /^\/api\//i.test(path) ? path.slice(4) : path;
  const url = new URL(BASE_URL + pathApi, window.location.origin);
  const hacer = () => fetch(url, { ...init, credentials: "include" });

  let respuesta;
  try {
    respuesta = await hacer();
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError("SIN_CONEXION", "No se pudo conectar con el servidor. Revisa tu conexión.", 0);
  }

  if (respuesta.status === 401) {
    const code = await codigoDeError(respuesta);
    if (puedeRenovar(pathApi, code) && (await intentarRenovarSesion())) {
      respuesta = await hacer();
    } else if (debeAvisarExpiracion(pathApi, code)) {
      avisarSesionExpirada();
    }
  }
  return respuesta;
}

/**
 * Petición HTTP genérica contra el backend real.
 * TODO backend: el backend debe responder siempre con el sobre
 * uniforme { ok: true, data } | { ok: false, error: { code, message } }
 * que acordamos — así el frontend nunca tiene que adivinar la forma
 * de la respuesta según el endpoint.
 */
export async function apiRequest(path, { method = "GET", body, params, signal } = {}, _esReintento = false) {
  const url = new URL(BASE_URL + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  const limite = conTiempoLimite(signal);
  let respuesta;
  let json = null;
  try {
    respuesta = await fetch(url, {
      method,
      // credentials:"include" es obligatorio para que el navegador
      // mande y acepte las cookies httpOnly del backend — sin esto,
      // aunque el login "funcione", la sesión no se guarda y el
      // siguiente request llega sin cookie, como si nunca hubieras
      // iniciado sesión.
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: limite.signal,
    });
    try {
      json = await respuesta.json();
    } catch (err) {
      // Una cancelación durante la lectura del cuerpo NO es "sin cuerpo":
      // se relanza (abajo) en vez de tratarla como una respuesta vacía.
      if (err.name === "AbortError") throw err;
      // Respuesta sin cuerpo (ej. 204 No Content) — no es un error.
    }
  } catch (err) {
    if (limite.expiro()) throw new ApiError("TIEMPO_AGOTADO", MENSAJE_TIEMPO_AGOTADO, 0);
    if (err.name === "AbortError") throw err; // no lo convertimos en ApiError: es un cancel intencional, no una falla real
    throw new ApiError("SIN_CONEXION", "No se pudo conectar con el servidor. Revisa tu conexión.", 0);
  } finally {
    limite.limpiar();
  }

  if (!respuesta.ok || (json && json.ok === false)) {
    const err = json?.error || {};

    // "Sesión expirada" solo debe salir cuando el backend específicamente
    // dice eso (código SESION_EXPIRADA) — un 401 en /login por contraseña
    // incorrecta también es 401, pero significa algo totalmente distinto
    // y NO debe limpiar una sesión (no había ninguna) ni mostrar ese
    // mensaje. Antes esto se decidía solo por el status 401, sin mirar
    // el código real, y tapaba errores como "contraseña incorrecta" o
    // "código MFA inválido" con un mensaje de sesión vencida.
    if (respuesta.status === 401 && puedeRenovar(path, err.code)) {
      if (!_esReintento) {
        const seRenovo = await intentarRenovarSesion();
        if (seRenovo) {
          return apiRequest(path, { method, body, params, signal }, true);
        }
      }
      if (debeAvisarExpiracion(path, err.code)) avisarSesionExpirada();
    }

    if (respuesta.status >= 500) {
      throw new ApiError("ERROR_SERVIDOR", "Ocurrió un error inesperado en el servidor.", respuesta.status);
    }
    if (respuesta.status === 400) {
      throw new ApiError(err.code || "VALIDACION", err.message || "Los datos enviados no son válidos.", 400);
    }
    throw new ApiError(err.code || "ERROR", err.message || "Ocurrió un error inesperado.", respuesta.status);
  }

  return json?.data ?? json;
}

export const apiClient = {
  get: (path, params, { signal } = {}) => apiRequest(path, { method: "GET", params, signal }),
  post: (path, body, { signal } = {}) => apiRequest(path, { method: "POST", body, signal }),
  patch: (path, body, { signal } = {}) => apiRequest(path, { method: "PATCH", body, signal }),
  put: (path, body, { signal } = {}) => apiRequest(path, { method: "PUT", body, signal }),
  delete: (path, { signal } = {}) => apiRequest(path, { method: "DELETE", signal }),
};
