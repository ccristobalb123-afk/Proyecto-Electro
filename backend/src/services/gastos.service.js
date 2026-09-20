import { db } from "../lib/db.js";
import { validacionFallida, ApiError, sinPermiso } from "../lib/errors.js";
import { empresasParaFiltro, verificarAccesoEmpresa } from "../lib/autorizacionEmpresa.js";

function fecha(v) {
  return v.toISOString().slice(0, 10);
}

function serializar(g) {
  return {
    id: g.id,
    empresa: g.empresa.slug,
    categoria: g.categoria.nombre,
    monto: Number(g.monto),
    fecha: fecha(g.fecha),
    proveedor: g.proveedor || "",
    trabajador: g.trabajador || "",
    descripcion: g.descripcion || "",
    archivo: !!g.archivoNombre,
    ...(g.archivoUrl ? { archivoUrl: g.archivoUrl } : {}),
  };
}

// ---------------- Categorías de gasto ----------------

export async function listarCategoriasGasto() {
  const categorias = await db.categoriaGasto.findMany({ orderBy: { id: "asc" } });
  return categorias.map((c) => c.nombre);
}

export async function agregarCategoriaGasto(nombre) {
  const nombreLimpio = nombre.trim();
  const yaExiste = await db.categoriaGasto.findUnique({ where: { nombre: nombreLimpio } });
  if (yaExiste) {
    throw new ApiError(409, "CATEGORIA_DUPLICADA", "Ya existe una categoría de gasto con ese nombre.");
  }
  await db.categoriaGasto.create({ data: { nombre: nombreLimpio } });
  return nombreLimpio;
}

export async function actualizarCategoriaGasto(nombreActual, nombreNuevo) {
  const categoria = await db.categoriaGasto.findUnique({ where: { nombre: nombreActual } });
  if (!categoria) throw new ApiError(404, "NO_ENCONTRADO", "La categoría no existe.");

  const nombreLimpio = nombreNuevo.trim();
  const otraConEseNombre = await db.categoriaGasto.findUnique({ where: { nombre: nombreLimpio } });
  if (otraConEseNombre && otraConEseNombre.id !== categoria.id) {
    throw new ApiError(409, "CATEGORIA_DUPLICADA", "Ya existe una categoría de gasto con ese nombre.");
  }
  const actualizada = await db.categoriaGasto.update({ where: { id: categoria.id }, data: { nombre: nombreLimpio } });
  return actualizada.nombre;
}

export async function eliminarCategoriaGasto(nombre) {
  const categoria = await db.categoriaGasto.findUnique({ where: { nombre } });
  if (!categoria) throw new ApiError(404, "NO_ENCONTRADO", "La categoría no existe.");

  const enUso = await db.gasto.count({ where: { categoriaId: categoria.id } });
  if (enUso > 0) {
    throw validacionFallida(`Hay ${enUso} gasto(s) usando esta categoría — no se puede eliminar mientras esté en uso.`);
  }
  await db.categoriaGasto.delete({ where: { id: categoria.id } });
  return { ok: true };
}

// ---------------- Gastos ----------------

async function buscarGasto(gastoId, empresasPermitidas) {
  const gasto = await db.gasto.findUnique({ where: { id: gastoId }, include: { empresa: true, categoria: true } });
  if (!gasto) throw new ApiError(404, "NO_ENCONTRADO", "El gasto no existe.");
  if (!empresasPermitidas.includes(gasto.empresa.slug)) throw sinPermiso();
  return gasto;
}

export async function listarGastos({ empresa, q }, empresasPermitidas) {
  const empresasFiltro = empresasParaFiltro(empresa, empresasPermitidas);
  const gastos = await db.gasto.findMany({
    where: {
      empresa: { slug: { in: empresasFiltro } },
      ...(q ? { categoria: { nombre: { contains: q, mode: "insensitive" } } } : {}),
    },
    include: { empresa: true, categoria: true },
    orderBy: { creadoEn: "desc" },
  });
  return gastos.map(serializar);
}

export async function crearGasto(datos, empresasPermitidas) {
  verificarAccesoEmpresa(datos.empresa, empresasPermitidas);

  const empresaRow = await db.empresa.findUnique({ where: { slug: datos.empresa } });
  if (!empresaRow) throw validacionFallida("Empresa inválida.");

  const categoriaRow = await db.categoriaGasto.findUnique({ where: { nombre: datos.categoria } });
  if (!categoriaRow) throw validacionFallida("La categoría de gasto indicada no existe.");

  const nuevo = await db.gasto.create({
    data: {
      empresaId: empresaRow.id,
      categoriaId: categoriaRow.id,
      monto: datos.monto,
      fecha: new Date(datos.fecha),
      proveedor: datos.proveedor?.trim() || null,
      trabajador: datos.trabajador?.trim() || null,
      descripcion: datos.descripcion?.trim() || null,
    },
    include: { empresa: true, categoria: true },
  });
  return serializar(nuevo);
}

export async function actualizarGasto(gastoId, datos, empresasPermitidas) {
  await buscarGasto(gastoId, empresasPermitidas);
  verificarAccesoEmpresa(datos.empresa, empresasPermitidas);

  const empresaRow = await db.empresa.findUnique({ where: { slug: datos.empresa } });
  if (!empresaRow) throw validacionFallida("Empresa inválida.");

  const categoriaRow = await db.categoriaGasto.findUnique({ where: { nombre: datos.categoria } });
  if (!categoriaRow) throw validacionFallida("La categoría de gasto indicada no existe.");

  const actualizado = await db.gasto.update({
    where: { id: gastoId },
    data: {
      empresaId: empresaRow.id,
      categoriaId: categoriaRow.id,
      monto: datos.monto,
      fecha: new Date(datos.fecha),
      proveedor: datos.proveedor?.trim() || null,
      trabajador: datos.trabajador?.trim() || null,
      descripcion: datos.descripcion?.trim() || null,
    },
    include: { empresa: true, categoria: true },
  });
  return serializar(actualizado);
}

export async function eliminarGasto(gastoId, empresasPermitidas) {
  await buscarGasto(gastoId, empresasPermitidas);
  await db.gasto.delete({ where: { id: gastoId } });
  return { ok: true };
}

export async function adjuntarComprobanteGasto(gastoId, archivoNombre, archivoUrl, empresasPermitidas) {
  await buscarGasto(gastoId, empresasPermitidas);
  const actualizado = await db.gasto.update({
    where: { id: gastoId },
    data: { archivoNombre, archivoUrl },
    include: { empresa: true, categoria: true },
  });
  return serializar(actualizado);
}
