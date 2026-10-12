// Espejo del `ApiError` que ya existe en el frontend (services/apiClient.js)
// — mismo shape { code, message, status } para que cuando el frontend
// arme su ApiError a partir de esta respuesta, code y message ya sean
// justo los que el usuario debe ver, sin traducir nada en el camino.
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function credencialesInvalidas() {
  return new ApiError(401, "CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos.");
}

export function noAutenticado() {
  return new ApiError(401, "NO_AUTENTICADO", "Debes iniciar sesión para continuar.");
}

export function sesionExpirada() {
  return new ApiError(401, "SESION_EXPIRADA", "Tu sesión expiró. Vuelve a iniciar sesión.");
}

export function sinPermiso() {
  return new ApiError(403, "SIN_PERMISO", "No tienes permiso para realizar esta acción.");
}

export function validacionFallida(mensaje) {
  return new ApiError(400, "VALIDACION", mensaje);
}

// 409: el pedido es válido, pero el estado actual del registro no lo
// permite (ej. eliminar algo que tiene pagos, historial o archivos que
// no se deben perder). El frontend lo muestra como explicación en un
// modal, no como un error genérico.
export function conflicto(mensaje, code = "CONFLICTO") {
  return new ApiError(409, code, mensaje);
}

// Envuelve un handler async de Express para que cualquier error (throw
// o promesa rechazada) llegue al middleware de errores en vez de colgar
// el request — evita escribir try/catch en cada controller.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Middleware final — convierte cualquier error en el sobre uniforme
// { ok: false, error: { code, message } } que el apiClient del
// frontend ya sabe interpretar.
export function manejadorDeErrores(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ApiError) {
    return res.status(err.status).json({ ok: false, error: { code: err.code, message: err.message } });
  }
  // Errores del lector de JSON (cuerpo mal formado o demasiado grande):
  // son errores del cliente, no del servidor — antes respondían 500 y
  // llenaban el log de "Error no controlado".
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ ok: false, error: { code: "VALIDACION", message: "El cuerpo de la petición no es JSON válido." } });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ ok: false, error: { code: "DEMASIADO_GRANDE", message: "La petición es demasiado grande." } });
  }
  console.error("Error no controlado:", err);
  return res.status(500).json({
    ok: false,
    error: { code: "ERROR_SERVIDOR", message: "Ocurrió un error inesperado en el servidor." },
  });
}
