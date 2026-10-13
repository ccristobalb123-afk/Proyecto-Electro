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

import { guardarEstadoServidor } from "./sesionCompartida";

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

// ---- Aviso global de "sesión terminada" ----
// El AuthContext se suscribe a esto para poder limpiar la sesión y
// redirigir al login sin que apiClient necesite importar el contexto
// (evita una dependencia circular services <-> context). Recibe el código
// del servidor, que dice el motivo (SESION_INACTIVA, SESION_MAXIMA,
// SESION_REVOCADA o SESION_EXPIRADA) para mostrarlo en el login.
const listenersSesionExpirada = new Set();
export function onSesionExpirada(callback) {
  listenersSesionExpirada.add(callback);
  return () => listenersSesionExpirada.delete(callback);
}
export function avisarSesionExpirada(code = "SESION_EXPIRADA") {
  listenersSesionExpirada.forEach((cb) => cb(code));
}

// Cierres decididos por el servidor (ver backend sesiones.service.js):
// renovar no sirve, se va directo al login con el motivo.
const CODIGOS_SESION_TERMINADA = new Set(["SESION_INACTIVA", "SESION_MAXIMA", "SESION_REVOCADA"]);

// ---- Renovación automática del access token ----
// El access token dura poco a propósito (15 min) por seguridad — pero
// eso no debería significar que la sesión se corte cada 15 min. Antes
// de avisar "sesión expirada", se intenta renovar en silencio con el
// refresh token y reintentar el pedido original UNA vez. El servidor
// solo renueva si hubo actividad del usuario en los últimos 30 min y
// si la sesión no llegó a su duración máxima.
//
// Varios pedidos que fallan a la vez comparten el mismo intento, y entre
// pestañas se hace de a una (Web Locks): cada renovación cambia el
// refresh token, y dos pestañas renovando con el mismo token parecerían
// un robo. Si aun así otra pestaña se adelantó, el servidor responde 409
// y la cookie nueva que dejó esa pestaña ya sirve.
let renovacionEnCurso = null;

async function pedirRenovacion() {
  let respuesta;
  try {
    respuesta = await fetch(new URL(BASE_URL + "/auth/refresh", window.location.origin), {
      method: "POST",
      credentials: "include",
    });
  } catch {
    return { ok: false, code: "SIN_CONEXION" };
  }
  if (respuesta.ok) {
    try {
      guardarEstadoServidor((await respuesta.json()).sesion);
    } catch {
      // Sin cuerpo: la renovación igual sirvió.
    }
    return { ok: true };
  }
  if (respuesta.status === 409) return { ok: true };
  return { ok: false, code: (await codigoDeError(respuesta)) || "SESION_EXPIRADA" };
}

/** Intenta renovar la sesión. Devuelve { ok, code } (code = motivo si no se pudo). */
export async function intentarRenovarSesion() {
  if (!renovacionEnCurso) {
    const conCandado = navigator.locks?.request
      ? navigator.locks.request("electro-renovar-sesion", pedirRenovacion)
      : pedirRenovacion();
    renovacionEnCurso = conCandado
      .catch(() => ({ ok: false, code: "SIN_CONEXION" }))
      .finally(() => {
        renovacionEnCurso = null;
      });
  }
  return renovacionEnCurso;
}

// Rutas de auth que se usan SIN sesión: ahí un 401 es una respuesta
// normal (contraseña incorrecta, código MFA inválido…), no una sesión
// vencida, y nunca se renueva ni se avisa nada.
const RUTAS_AUTH_PUBLICAS = ["/auth/login", "/auth/verify-mfa", "/auth/mfa-setup", "/auth/forgot-password", "/auth/reset-password", "/auth/refresh", "/auth/logout"];
const esRutaPublica = (path) => RUTAS_AUTH_PUBLICAS.some((r) => path.startsWith(r));

// La cookie de acceso vence a los 15 min junto con el token, así que
// pasado ese tiempo el navegador directamente deja de enviarla y el
// backend responde NO_AUTENTICADO (no SESION_EXPIRADA): en los dos casos
// se intenta renovar. /auth/me también — así un F5 después de 15 min
// recupera la sesión en vez de pedir login.
function puedeRenovar(path, code) {
  if (esRutaPublica(path)) return false;
  return code === "SESION_EXPIRADA" || code === "NO_AUTENTICADO";
}

// Se avisa "sesión expirada" (limpia la sesión y manda al login) solo
// si de verdad había una — un /auth/me sin sesión al abrir la app es
// la situación normal de cualquiera que no inició sesión todavía.
function debeAvisarExpiracion(path, code) {
  if (esRutaPublica(path)) return false;
  return code === "SESION_EXPIRADA" || (code === "NO_AUTENTICADO" && path !== "/auth/me");
}

// Qué hacer ante un 401 de una ruta con sesión. Devuelve true si se
// renovó y conviene reintentar; si no, ya avisó el cierre cuando
// correspondía. Lanza SIN_CONEXION si no se pudo ni preguntar.
async function manejar401(path, code, puedeReintentar) {
  if (esRutaPublica(path)) return false;
  if (CODIGOS_SESION_TERMINADA.has(code)) {
    avisarSesionExpirada(code);
    return false;
  }
  if (!puedeRenovar(path, code)) return false;
  if (puedeReintentar) {
    const renovacion = await intentarRenovarSesion();
    if (renovacion.ok) return true;
    if (renovacion.code === "SIN_CONEXION") {
      throw new ApiError("SIN_CONEXION", "No se pudo conectar con el servidor. Revisa tu conexión.", 0);
    }
    // El refresh dice el motivo real (inactividad, 12 h, revocada…);
    // NO_AUTENTICADO = no había refresh token (abrir la app sin sesión).
    if (renovacion.code !== "NO_AUTENTICADO" || path !== "/auth/me") {
      avisarSesionExpirada(renovacion.code === "NO_AUTENTICADO" ? "SESION_EXPIRADA" : renovacion.code);
    }
    return false;
  }
  if (debeAvisarExpiracion(path, code)) avisarSesionExpirada(code);
  return false;
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

  if (respuesta.status === 401 && (await manejar401(pathApi, await codigoDeError(respuesta), true))) {
    respuesta = await hacer();
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
    if (respuesta.status === 401 && (await manejar401(path, err.code, !_esReintento))) {
      return apiRequest(path, { method, body, params, signal }, true);
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
