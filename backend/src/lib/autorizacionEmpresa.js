import { sinPermiso } from "./errors.js";

// Si el usuario pidió un filtro de empresa explícito (?empresa=electro),
// tiene que ser una a la que tenga acceso — si no, 403. Si NO pidió
// ningún filtro, se restringe SOLO a las empresas que sí puede ver, en
// vez de mostrarle ambas por defecto (antes esto no pasaba: un usuario
// de una sola empresa veía igual los datos de las dos).
export function empresasParaFiltro(empresaSolicitada, empresasPermitidas) {
  if (empresaSolicitada) {
    if (!empresasPermitidas.includes(empresaSolicitada)) throw sinPermiso();
    return [empresaSolicitada];
  }
  return empresasPermitidas;
}

// Para crear o asignar un registro a una empresa puntual — rechaza si
// el usuario no pertenece a esa empresa (ej. no puede crear un equipo
// "de Electro" si él solo tiene acceso a Corevex).
export function verificarAccesoEmpresa(empresaSlug, empresasPermitidas) {
  if (!empresasPermitidas.includes(empresaSlug)) throw sinPermiso();
}
