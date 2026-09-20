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

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Los archivos subidos (fotos, PDFs, comprobantes) se sirven bajo
// /api/uploads/:filename, protegidos por sesión (ya no son públicos) —
// el backend ya devuelve el archivoUrl completo con el "/api" incluido
// (ej. "/api/uploads/xxx.pdf"), así que esta constante solo antepone
// el origen (protocolo + dominio + puerto) para armar el link completo.
export const ARCHIVOS_BASE_URL = BASE_URL.replace(/\/api\/?$/, "");

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
function avisarSesionExpirada() {
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
async function intentarRenovarSesion() {
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

  let respuesta;
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
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err; // no lo convertimos en ApiError: es un cancel intencional, no una falla real
    throw new ApiError("SIN_CONEXION", "No se pudo conectar con el servidor. Revisa tu conexión.", 0);
  }

  let json = null;
  try {
    json = await respuesta.json();
  } catch {
    // Respuesta sin cuerpo (ej. 204 No Content) — no es un error.
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
    if (err.code === "SESION_EXPIRADA") {
      if (!_esReintento) {
        const seRenovo = await intentarRenovarSesion();
        if (seRenovo) {
          return apiRequest(path, { method, body, params, signal }, true);
        }
      }
      avisarSesionExpirada();
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
