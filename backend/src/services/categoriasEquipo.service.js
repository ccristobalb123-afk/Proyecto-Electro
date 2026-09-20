import { db } from "../lib/db.js";
import { ApiError, validacionFallida } from "../lib/errors.js";

export async function listarCategorias() {
  const categorias = await db.categoriaEquipo.findMany({ orderBy: { id: "asc" } });
  // El frontend espera un objeto { "Nombre de categoría": [campos] },
  // no un array — mismo shape que tenía la constante CATEGORIAS.
  const resultado = {};
  for (const c of categorias) {
    resultado[c.nombre] = c.campos;
  }
  return resultado;
}

function limpiarCampos(campos) {
  return campos
    .filter((c) => c.nombre?.trim())
    .map((c) => ({ nombre: c.nombre.trim(), placeholder: (c.placeholder || "").trim() }));
}

export async function agregarCategoria(nombre, campos) {
  const nombreLimpio = nombre.trim();
  const yaExiste = await db.categoriaEquipo.findUnique({ where: { nombre: nombreLimpio } });
  if (yaExiste) {
    throw new ApiError(409, "CATEGORIA_DUPLICADA", "Ya existe una categoría con ese nombre.");
  }

  await db.categoriaEquipo.create({ data: { nombre: nombreLimpio, campos: limpiarCampos(campos) } });
  return nombreLimpio;
}

// Se identifica por su nombre ACTUAL (nombreActual), porque es lo
// único que el frontend conoce de una categoría — no tiene su id a
// mano (las trae como objeto { nombre: campos }, no como lista con id).
export async function actualizarCategoria(nombreActual, { nombre, campos }) {
  const categoria = await db.categoriaEquipo.findUnique({ where: { nombre: nombreActual } });
  if (!categoria) throw new ApiError(404, "NO_ENCONTRADO", "La categoría no existe.");

  const nombreLimpio = nombre.trim();
  const otraConEseNombre = await db.categoriaEquipo.findUnique({ where: { nombre: nombreLimpio } });
  if (otraConEseNombre && otraConEseNombre.id !== categoria.id) {
    throw new ApiError(409, "CATEGORIA_DUPLICADA", "Ya existe una categoría con ese nombre.");
  }

  await db.categoriaEquipo.update({
    where: { id: categoria.id },
    data: { nombre: nombreLimpio, campos: limpiarCampos(campos) },
  });
  return nombreLimpio;
}

export async function eliminarCategoria(nombre) {
  const categoria = await db.categoriaEquipo.findUnique({ where: { nombre } });
  if (!categoria) throw new ApiError(404, "NO_ENCONTRADO", "La categoría no existe.");

  const enUso = await db.equipo.count({ where: { categoriaId: categoria.id } });
  if (enUso > 0) {
    throw validacionFallida(`Hay ${enUso} equipo(s) usando esta categoría — no se puede eliminar mientras esté en uso.`);
  }

  await db.categoriaEquipo.delete({ where: { id: categoria.id } });
  return { ok: true };
}
