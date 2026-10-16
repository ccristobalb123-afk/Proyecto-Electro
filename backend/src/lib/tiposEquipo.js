// ============================================================
// Tipos de equipo y qué campos pide cada uno.
//
// Única fuente de verdad: el backend valida con esto y el frontend recibe
// las mismas reglas por GET /api/categorias-equipo (no tiene su propia
// copia). Cada categoría de la base se asocia a un tipo por su columna
// `tipo`; los nombres visibles se pueden corregir sin romper nada.
//
// Todos los campos listados son OBLIGATORIOS para ese tipo; los que no
// están no se muestran ni se guardan.
// ============================================================

const FECHAS_INSPECCION = ["fechaInspeccion", "fechaVencimiento"];
const EPP_ALTURA = ["marca", "serial", "lote", "fechaFabricacion", ...FECHAS_INSPECCION];

export const TIPOS_EQUIPO = {
  ESCALERA_EMBONABLE: { nombre: "Escalera Embonable", campos: ["codigo", "marca", "pasos", ...FECHAS_INSPECCION] },
  PINZA_AMPERIMETRICA: { nombre: "Pinza Amperimétrica", campos: ["codigo", "marca", "serial", ...FECHAS_INSPECCION] },
  SECUENCIMETRO: { nombre: "Secuencímetro", campos: ["codigo", "marca", "serial", ...FECHAS_INSPECCION] },
  GUANTES_DIELECTRICOS: { nombre: "Guantes Dieléctricos", campos: ["codigo", "marca", "talla", ...FECHAS_INSPECCION] },
  ARNES: { nombre: "Arnés", campos: EPP_ALTURA },
  LINEA_DE_VIDA: { nombre: "Línea de Vida", campos: EPP_ALTURA },
  ESLINGA_ANCLAJE: { nombre: "Eslinga de Anclaje", campos: EPP_ALTURA },
  ESTROBO_POSICIONAMIENTO: { nombre: "Estrobo de Posicionamiento", campos: EPP_ALTURA },
  ESTROBO_REGULABLE: { nombre: "Estrobo Regulable", campos: EPP_ALTURA },
};

/** Orden de los tipos en el formulario y en las listas (el de la tabla). */
export const ORDEN_TIPOS = Object.keys(TIPOS_EQUIPO);

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

/** Campos que pide un tipo (null si la categoría no tiene tipo: categoría antigua). */
export function camposDelTipo(tipo) {
  return TIPOS_EQUIPO[tipo]?.campos ?? null;
}

/**
 * Cómo se identifica un equipo de este tipo: por Código si el tipo lo
 * pide; si no (arnés, línea de vida, eslinga, estrobos), por Serial.
 */
export function campoIdentificador(tipo) {
  const campos = camposDelTipo(tipo);
  if (!campos) return "codigo";
  return campos.includes("codigo") ? "codigo" : "serial";
}

/** Nombre visible de una categoría: el de la tabla para los 9 tipos (aunque en la base diga "Escaleras Embonables" o "Secuencimetro"). */
export function nombreCategoria(categoria) {
  return TIPOS_EQUIPO[categoria.tipo]?.nombre ?? categoria.nombre;
}

/** Tipo cuyo nombre visible es `nombre`, o null (categoría antigua). */
export function tipoPorNombre(nombre) {
  return ORDEN_TIPOS.find((t) => TIPOS_EQUIPO[t].nombre === nombre) ?? null;
}
