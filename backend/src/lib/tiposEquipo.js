// ============================================================
// Datos que puede pedir un tipo de equipo y cómo se leen sus reglas.
//
// Las reglas de cada tipo (destino, varias unidades por destinatario y
// qué datos pide) viven en la base, en categorias_equipo, y se editan
// desde Operaciones > Equipos > "Tipos de equipo". Los valores iniciales
// de los 9 tipos están en la migración 20261020100000_reglas_tipos_equipo
// (los mismos que tenía este archivo). Acá queda solo el catálogo de
// campos posibles, igual para todos los tipos.
//
// Todos los campos que pide un tipo son OBLIGATORIOS; los que no pide no
// se muestran ni se guardan.
// ============================================================

/** Datos que puede pedir un tipo, en el orden en que se muestran. */
export const CAMPOS_OPCIONALES = ["codigo", "marca", "pasos", "serial", "talla", "lote", "fechaFabricacion"];

/** Siempre obligatorias, en todos los tipos. */
export const FECHAS_INSPECCION = ["fechaInspeccion", "fechaVencimiento"];

export const ETIQUETAS_CAMPO = {
  codigo: "Código",
  marca: "Marca",
  pasos: "Pasos",
  serial: "Serial",
  talla: "Talla",
  lote: "Lote",
  fechaFabricacion: "Fecha de fabricación",
  fechaInspeccion: "Fecha de inspección",
  fechaVencimiento: "Fecha de vencimiento",
};

/** Heredada: categoría de la versión anterior sin reglas ("Estrobo Largo"). */
export function esHeredada(categoria) {
  return !categoria.camposRequeridos?.length;
}

/** Campos que pide la categoría (con las fechas), o null si es heredada. */
export function camposDelTipo(categoria) {
  return esHeredada(categoria) ? null : [...categoria.camposRequeridos, ...FECHAS_INSPECCION];
}

/** Se pueden registrar equipos nuevos de este tipo. */
export function admiteRegistro(categoria) {
  return categoria.activo && !esHeredada(categoria);
}

/**
 * Cómo se identifica un equipo de este tipo: por Código si el tipo lo
 * pide; si no (arnés, línea de vida, eslinga, estrobos), por Serial.
 */
export function campoIdentificador(categoria) {
  const campos = camposDelTipo(categoria);
  if (!campos) return "codigo";
  return campos.includes("codigo") ? "codigo" : "serial";
}

/** "camion" | "persona", como lo usa la API. */
export const destinoApi = (categoria) => (categoria.destino === "CAMION" ? "camion" : "persona");

/** Para buscar y comparar nombres sin distinguir mayúsculas ni tildes. */
export const normalizarTexto = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es").trim();
