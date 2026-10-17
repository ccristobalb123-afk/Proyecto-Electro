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

/** Mismas reglas que el backend: vencimiento no antes de la inspección, ni ya vencido. */
export function errorFechasRenovacion({ fechaInspeccion, fechaVencimiento }) {
  if (!fechaInspeccion || !fechaVencimiento) return "Ingresa la fecha de inspección y la de vencimiento.";
  if (fechaVencimiento < fechaInspeccion) return "La fecha de vencimiento no puede ser anterior a la fecha de inspección.";
  if (fechaVencimiento < hoyEnPeru()) return "La fecha de vencimiento ya pasó: el equipo seguiría vencido. Ingresa una fecha de hoy en adelante.";
  return "";
}
