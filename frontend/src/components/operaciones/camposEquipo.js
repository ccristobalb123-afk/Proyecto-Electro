// Campos de equipo por tipo: cómo se pide cada uno y helpers del
// formulario. QUÉ campos pide cada tipo no se decide acá: llega del
// backend (GET /categorias-equipo → campos), que es quien valida.
const MAYUSCULAS = { autoCapitalize: "characters", autoCorrect: "off", spellCheck: false };
export const CAMPOS_EQUIPO = {
  codigo: { etiqueta: "Código", placeholder: "Ej. ITM-1019-2025", maxLength: 40, mayusculas: true, props: MAYUSCULAS },
  marca: { etiqueta: "Marca", placeholder: "Ej. Kyoritsu", maxLength: 60, props: { autoCapitalize: "words" } },
  pasos: { etiqueta: "Pasos", placeholder: "Ej. 8", maxLength: 3, soloNumeros: true, props: { inputMode: "numeric", pattern: "[0-9]*" } },
  serial: { etiqueta: "Serial", placeholder: "Ej. E8039684", maxLength: 40, mayusculas: true, props: MAYUSCULAS },
  talla: { etiqueta: "Talla", placeholder: "Ej. 9 o M", maxLength: 10, mayusculas: true, props: MAYUSCULAS },
  // Los lotes suelen llevar letras ("L2025-03"): teclado normal en mayúsculas.
  lote: { etiqueta: "Lote", placeholder: "Ej. L2025-03", maxLength: 40, mayusculas: true, props: MAYUSCULAS },
  fechaFabricacion: { etiqueta: "Fecha de fabricación", fecha: true },
  fechaInspeccion: { etiqueta: "Fecha de inspección", fecha: true },
  fechaVencimiento: { etiqueta: "Fecha de vencimiento", fecha: true },
};

/** Hoy en Perú ("AAAA-MM-DD"), para que la fabricación no pueda ser futura. */
export function hoyEnPeru() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
}

/** Formulario vacío con TODOS los campos posibles (los que no aplican se ignoran). */
export function valoresEquipoVacios() {
  return { codigo: "", marca: "", pasos: "", serial: "", talla: "", lote: "", fechaFabricacion: "", fechaInspeccion: "", fechaVencimiento: "", diasAnticipacion: 15 };
}

/** Solo los campos del tipo elegido: lo que se oculta al cambiar de tipo no se envía. */
export function valoresParaEnviar(valores, campos) {
  const datos = { diasAnticipacion: valores.diasAnticipacion };
  for (const campo of campos) datos[campo] = valores[campo];
  return datos;
}

// ---- Fotos del equipo: siempre 2 (ver FotosEquipo.jsx) ----
// Valor de una foto que se mantiene (la que ya tiene el equipo en esa
// posición). El backend entiende lo mismo ("actual").
export const MANTENER = "actual";

/** Valor inicial: mantener las fotos que tiene; las que faltan, vacías. */
export function fotosIniciales(actuales = []) {
  return [0, 1].map((i) => (actuales?.[i] ? MANTENER : null));
}

/** Cuántas de las 2 fotos faltan. */
export const fotosQueFaltan = (valor) => valor.filter((v) => !v).length;
