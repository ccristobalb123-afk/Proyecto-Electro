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

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

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

// ---- Token de sesión ----
// Se guarda en memoria (no localStorage, para no persistir el token
// entre pestañas de forma insegura) y lo setea/limpia el AuthContext.
let authToken = null;
export function setAuthToken(token) {
  authToken = token;
}
export function getAuthToken() {
  return authToken;
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

/**
 * Petición HTTP genérica contra el backend real.
 * TODO backend: el backend debe responder siempre con el sobre
 * uniforme { ok: true, data } | { ok: false, error: { code, message } }
 * que acordamos — así el frontend nunca tiene que adivinar la forma
 * de la respuesta según el endpoint.
 */
export async function apiRequest(path, { method = "GET", body, params } = {}) {
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
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("SIN_CONEXION", "No se pudo conectar con el servidor. Revisa tu conexión.", 0);
  }

  if (respuesta.status === 401) {
    avisarSesionExpirada();
    throw new ApiError("SESION_EXPIRADA", "Tu sesión expiró. Vuelve a iniciar sesión.", 401);
  }

  if (respuesta.status === 403) {
    throw new ApiError("SIN_PERMISO", "No tienes permiso para realizar esta acción.", 403);
  }

  if (respuesta.status === 404) {
    throw new ApiError("NO_ENCONTRADO", "El registro solicitado no existe o fue eliminado.", 404);
  }

  let json = null;
  try {
    json = await respuesta.json();
  } catch {
    // Respuesta sin cuerpo (ej. 204 No Content) — no es un error.
  }

  if (!respuesta.ok || (json && json.ok === false)) {
    const err = json?.error || {};
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
  get: (path, params) => apiRequest(path, { method: "GET", params }),
  post: (path, body) => apiRequest(path, { method: "POST", body }),
  patch: (path, body) => apiRequest(path, { method: "PATCH", body }),
  put: (path, body) => apiRequest(path, { method: "PUT", body }),
  delete: (path) => apiRequest(path, { method: "DELETE" }),
};
