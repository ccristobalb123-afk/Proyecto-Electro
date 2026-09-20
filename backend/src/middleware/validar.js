import { validacionFallida } from "../lib/errors.js";

// Uso: router.post("/login", validar(loginSchema), controller)
// Si el body no cumple el schema, corta acá con un 400 uniforme y el
// controller ni se llega a ejecutar — evita repetir validaciones a mano
// en cada controller.
export function validar(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.body);
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]?.message || "Datos inválidos.";
      return next(validacionFallida(primerError));
    }
    req.body = resultado.data; // reemplaza por la versión ya parseada/transformada
    next();
  };
}

// Igual que validar(), pero para query params (?rol=&q=) en vez del
// body — útil en los GET de listado con filtros.
export function validarQuery(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.query);
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]?.message || "Parámetros inválidos.";
      return next(validacionFallida(primerError));
    }
    req.query = resultado.data;
    next();
  };
}
