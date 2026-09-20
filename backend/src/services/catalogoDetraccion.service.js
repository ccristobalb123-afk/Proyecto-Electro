import { db } from "../lib/db.js";

function serializar(c) {
  return {
    id: c.id,
    codigo: c.codigo,
    descripcion: c.descripcion,
    anexo: c.anexo,
    porcentaje: Number(c.porcentaje),
    montoMinimo: c.montoMinimo != null ? Number(c.montoMinimo) : null,
    vigenteDesde: c.vigenteDesde.toISOString().slice(0, 10),
    vigenteHasta: c.vigenteHasta ? c.vigenteHasta.toISOString().slice(0, 10) : null,
  };
}

// Solo lectura: el catálogo se administra por seed/migración (son
// ~10-15 códigos que SUNAT cambia con poca frecuencia). Si más
// adelante hace falta editarlo desde la UI, se agrega CRUD igual que
// ya existe para CategoriaGasto.
export async function listarCatalogoDetraccion({ soloVigentes = true } = {}) {
  const hoy = new Date();
  const catalogo = await db.catalogoDetraccion.findMany({
    where: soloVigentes
      ? { vigenteDesde: { lte: hoy }, OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: hoy } }] }
      : undefined,
    orderBy: { codigo: "asc" },
  });
  return catalogo.map(serializar);
}
