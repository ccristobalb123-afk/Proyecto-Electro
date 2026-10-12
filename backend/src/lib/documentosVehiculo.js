import { diasHasta } from "./estadoVencimiento.js";

// Catálogo fijo de documentos de vehículo — única fuente de verdad del
// backend (nombres, orden, cuáles pueden no vencer y cuáles son solo
// para grúas). El frontend tiene su espejo en vehiculosService.js.
//
// `vence: false`: la Tarjeta de Propiedad no tiene vencimiento, y el
// permiso de Lunas Polarizadas en la práctica tampoco (sigue vigente
// mientras no cambie el titular). En esos dos el vencimiento es
// OPCIONAL: si no se registra, el estado es "No vence" (sin alerta);
// si la empresa sí maneja una fecha (ej. una renovación interna), se
// puede cargar y entonces avisa igual que los demás. En los otros 5,
// sin fecha el estado es "Sin fecha", para que se note que falta.
// `aviso`: cómo se nombra en los avisos (lib/mensajesAlerta.js) —
// artículo, género y número para que el texto concuerde ("El SOAT…
// vence", "La Revisión Técnica… vencida", "Las Lunas Polarizadas…
// vencen").
export const CATALOGO_DOCUMENTOS = [
  { clave: "SOAT", nombre: "SOAT", vence: true, aviso: { frase: "El SOAT", genero: "m" } },
  { clave: "REVISION_TECNICA", nombre: "Revisión Técnica", vence: true, aviso: { frase: "La Revisión Técnica", genero: "f" } },
  { clave: "SEGURO_TODO_RIESGO", nombre: "Seguro Contra Todo Riesgo", vence: true, aviso: { frase: "El Seguro Contra Todo Riesgo", genero: "m" } },
  { clave: "TARJETA_PROPIEDAD", nombre: "Tarjeta de Propiedad", vence: false, aviso: { frase: "La Tarjeta de Propiedad", genero: "f" } },
  {
    clave: "HABILITACION_VEHICULAR",
    nombre: "Habilitación Vehicular / Tarjeta de Circulación",
    vence: true,
    aviso: { frase: "La Habilitación Vehicular / Tarjeta de Circulación", genero: "f" },
  },
  { clave: "LUNAS_POLARIZADAS", nombre: "Lunas Polarizadas", vence: false, aviso: { frase: "Las Lunas Polarizadas", genero: "f", plural: true } },
  { clave: "BRAZO_HIDRAULICO", nombre: "Brazo Hidráulico", vence: true, soloGrua: true, aviso: { frase: "El Brazo Hidráulico", genero: "m" } },
];

export const CLAVES_DOCUMENTO = CATALOGO_DOCUMENTOS.map((d) => d.clave);
const POR_CLAVE = Object.fromEntries(CATALOGO_DOCUMENTOS.map((d) => [d.clave, d]));

export function infoDocumento(clave) {
  return POR_CLAVE[clave] || null;
}

// Nombre visible: el del catálogo, o el texto original si es un
// documento del sistema anterior.
export function nombreDocumento(doc) {
  return POR_CLAVE[doc.tipoDocumento]?.nombre || doc.tipo;
}

// Misma función de días que Contratos y Cursos (ver estadoVencimiento.js).
export { diasHasta };

/**
 * Estado de un documento, calculado al leer (igual que Contratos): usa
 * los días de anticipación de ESE documento, no un umbral global.
 *   vigente | porvencer | vencido | sinfecha | novence
 */
export function estadoDocumento(doc) {
  if (!doc.fechaVencimiento) {
    const vence = doc.tipoDocumento ? POR_CLAVE[doc.tipoDocumento]?.vence : true;
    return { estado: vence === false ? "novence" : "sinfecha", dias: null };
  }
  const dias = diasHasta(doc.fechaVencimiento);
  if (dias < 0) return { estado: "vencido", dias };
  if (dias <= doc.diasAnticipacion) return { estado: "porvencer", dias };
  return { estado: "vigente", dias };
}
