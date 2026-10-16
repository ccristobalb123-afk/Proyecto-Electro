import { db } from "../lib/db.js";
import { ORDEN_TIPOS, camposDelTipo, campoIdentificador, nombreCategoria } from "../lib/tiposEquipo.js";

/**
 * Tipos de equipo para el formulario y los filtros, en el orden de la
 * tabla: [{ nombre, tipo, campos: ["codigo", "marca", ...], identificador }].
 * Las categorías antiguas sin tipo se incluyen SOLO si todavía tienen
 * equipos (para poder verlos y editarlos), marcadas con `antigua: true` y
 * con sus campos libres en `camposLibres`; no se ofrecen para registrar.
 */
export async function listarCategorias() {
  const categorias = await db.categoriaEquipo.findMany({ include: { _count: { select: { equipos: true } } } });
  const conTipo = categorias
    .filter((c) => camposDelTipo(c.tipo))
    .sort((a, b) => ORDEN_TIPOS.indexOf(a.tipo) - ORDEN_TIPOS.indexOf(b.tipo))
    .map((c) => ({ nombre: nombreCategoria(c), tipo: c.tipo, campos: camposDelTipo(c.tipo), identificador: campoIdentificador(c.tipo) }));
  const antiguas = categorias
    .filter((c) => !camposDelTipo(c.tipo) && c._count.equipos > 0)
    .map((c) => ({ nombre: c.nombre, tipo: null, antigua: true, campos: ["codigo"], camposLibres: c.campos, identificador: "codigo" }));
  return [...conTipo, ...antiguas];
}
