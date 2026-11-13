import { validacionFallida } from "../lib/errors.js";

// ---- Tope de tamaño antes de zod ----
// zod (aviso GHSA-mrhx-c7xc-m3w5, corregido recién en zod 4.6.6) crea un
// error por cada elemento inválido de un arreglo, sin límite: un cuerpo de
// 2 MB como {"fotos":[1,1,1,…]} costaba ~1,5 s y ~300 MB de memoria por
// petición. Por eso, antes de llamar a zod, se rechaza cualquier cuerpo con
// más de lo que una pantalla real puede mandar.
//
// Arreglos más grandes de nuestros esquemas: los documentos de un vehículo
// y los campos de un tipo de equipo (7 cada uno: uno por tipo de documento
// o de campo, sin repetir), los módulos de un usuario (5) y las fotos y
// empresas (2). 50 deja de sobra para crecer y sigue siendo barato.
// La profundidad máxima real es 3 (documentos[i].campo); el recorrido es
// iterativo (sin recursión) y se corta al pasar cualquiera de los topes.
export const MAX_ELEMENTOS_ARREGLO = 50;
export const MAX_PROFUNDIDAD = 8;
const MAX_VALORES = 5000; // valores dentro de objetos y arreglos, en total
const MENSAJE_EXCESO = "Los datos enviados tienen demasiados elementos.";

/** true si `raiz` pasa alguno de los topes (no lo recorre entero si no hace falta). */
export function excedeTopes(raiz) {
  if (raiz === null || typeof raiz !== "object") return false;
  const pila = [raiz];
  const profundidades = [0];
  let valores = 0;
  while (pila.length) {
    const valor = pila.pop();
    const profundidad = profundidades.pop();
    if (profundidad >= MAX_PROFUNDIDAD) return true;
    if (Array.isArray(valor)) {
      if (valor.length > MAX_ELEMENTOS_ARREGLO) return true;
      valores += valor.length;
      if (valores > MAX_VALORES) return true;
      for (const hijo of valor) {
        if (hijo !== null && typeof hijo === "object") {
          pila.push(hijo);
          profundidades.push(profundidad + 1);
        }
      }
    } else {
      for (const clave in valor) {
        if (++valores > MAX_VALORES) return true;
        const hijo = valor[clave];
        if (hijo !== null && typeof hijo === "object") {
          pila.push(hijo);
          profundidades.push(profundidad + 1);
        }
      }
    }
  }
  return false;
}

// Uso: router.post("/login", validar(loginSchema), controller)
// Si el body no cumple el schema, corta acá con un 400 uniforme y el
// controller ni se llega a ejecutar — evita repetir validaciones a mano
// en cada controller.
export function validar(schema) {
  return (req, res, next) => {
    if (excedeTopes(req.body)) return next(validacionFallida(MENSAJE_EXCESO));
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
    if (excedeTopes(req.query)) return next(validacionFallida(MENSAJE_EXCESO));
    const resultado = schema.safeParse(req.query);
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]?.message || "Parámetros inválidos.";
      return next(validacionFallida(primerError));
    }
    req.query = resultado.data;
    next();
  };
}
