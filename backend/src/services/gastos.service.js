import { db } from "../lib/db.js";
import { validacionFallida, ApiError, sinPermiso, conflicto } from "../lib/errors.js";
import { empresasParaFiltro, verificarAccesoEmpresa } from "../lib/autorizacionEmpresa.js";
import { borrarArchivoSiHuerfano, verificarArchivoSubido } from "../lib/archivos.js";
import { registrarEventoAuditoria } from "../lib/seguridad.js";

function fecha(v) {
  return v.toISOString().slice(0, 10);
}

const TIPO_A_ENUM = { boleta: "BOLETA", factura: "FACTURA" };

// Lo que le falta a un gasto anterior a oct 2026 (sin tipo ni documento):
// la lista lo marca con "Faltan datos" y el formulario lo pide al editar.
function faltantesDe(g) {
  const faltan = [];
  if (!g.tipoComprobante) faltan.push("Tipo de comprobante");
  if (!g.archivoUrl) faltan.push("Documento adjunto");
  return faltan;
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
    tipoComprobante: g.tipoComprobante ? g.tipoComprobante.toLowerCase() : null,
    rucProveedor: g.rucProveedor || "",
    archivo: !!g.archivoNombre,
    ...(g.archivoUrl ? { archivoUrl: g.archivoUrl, archivoNombre: g.archivoNombre } : {}),
    faltantes: faltantesDe(g),
  };
}

// Campos comunes de crear/editar. El RUC solo se guarda en una Factura.
function datosGasto(datos, empresaId, categoriaId) {
  return {
    empresaId,
    categoriaId,
    monto: datos.monto,
    fecha: new Date(datos.fecha),
    proveedor: datos.proveedor?.trim() || null,
    trabajador: datos.trabajador?.trim() || null,
    descripcion: datos.descripcion?.trim() || null,
    tipoComprobante: TIPO_A_ENUM[datos.tipoComprobante],
    rucProveedor: datos.tipoComprobante === "factura" ? datos.rucProveedor : null,
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
    throw conflicto(`No se puede eliminar: hay ${enUso} ${enUso === 1 ? "gasto registrado" : "gastos registrados"} con esta categoría. Puedes renombrarla en su lugar.`, "CATEGORIA_EN_USO");
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

export async function listarGastos({ empresa, q, tipo }, empresasPermitidas) {
  const empresasFiltro = empresasParaFiltro(empresa, empresasPermitidas);
  const gastos = await db.gasto.findMany({
    where: {
      empresa: { slug: { in: empresasFiltro } },
      ...(q ? { categoria: { nombre: { contains: q, mode: "insensitive" } } } : {}),
      ...(tipo ? { tipoComprobante: tipo === "sin" ? null : TIPO_A_ENUM[tipo] } : {}),
    },
    include: { empresa: true, categoria: true },
    orderBy: { creadoEn: "desc" },
  });
  return gastos.map(serializar);
}

async function empresaYCategoria(datos) {
  const empresaRow = await db.empresa.findUnique({ where: { slug: datos.empresa } });
  if (!empresaRow) throw validacionFallida("Empresa inválida.");
  const categoriaRow = await db.categoriaGasto.findUnique({ where: { nombre: datos.categoria } });
  if (!categoriaRow) throw validacionFallida("La categoría de gasto indicada no existe.");
  return [empresaRow.id, categoriaRow.id];
}

// El documento (foto o PDF de la boleta o factura) es obligatorio: se
// sube antes por /api/uploads, igual que en Contratos y Cursos, y acá
// llega su URL.
export async function crearGasto(datos, empresasPermitidas) {
  verificarAccesoEmpresa(datos.empresa, empresasPermitidas);
  const [empresaId, categoriaId] = await empresaYCategoria(datos);
  await verificarArchivoSubido(datos.archivoUrl);

  const nuevo = await db.gasto.create({
    data: {
      ...datosGasto(datos, empresaId, categoriaId),
      archivoNombre: datos.archivoNombre || "Comprobante",
      archivoUrl: datos.archivoUrl,
    },
    include: { empresa: true, categoria: true },
  });
  return serializar(nuevo);
}

// Al editar, el documento se reemplaza solo si llega uno nuevo; si no,
// se conserva el que tiene. Un gasto antiguo sin documento no se puede
// guardar sin adjuntarle uno. El archivo reemplazado se borra del disco.
export async function actualizarGasto(gastoId, datos, empresasPermitidas) {
  const anterior = await buscarGasto(gastoId, empresasPermitidas);
  verificarAccesoEmpresa(datos.empresa, empresasPermitidas);
  const [empresaId, categoriaId] = await empresaYCategoria(datos);

  const archivoNuevo = datos.archivoUrl && datos.archivoUrl !== anterior.archivoUrl;
  if (archivoNuevo) await verificarArchivoSubido(datos.archivoUrl);
  else if (!anterior.archivoUrl) throw validacionFallida("Adjunta la foto o PDF del comprobante: es obligatorio.");

  const actualizado = await db.gasto.update({
    where: { id: gastoId },
    data: {
      ...datosGasto(datos, empresaId, categoriaId),
      ...(archivoNuevo ? { archivoNombre: datos.archivoNombre || "Comprobante", archivoUrl: datos.archivoUrl } : {}),
    },
    include: { empresa: true, categoria: true },
  });
  if (archivoNuevo) await borrarArchivoSiHuerfano(anterior.archivoUrl);
  return serializar(actualizado);
}

// Se elimina el gasto y su documento del disco (antes un gasto con
// documento no se podía eliminar; con el documento obligatorio, eso
// habría impedido eliminar cualquier gasto). Solo SuperAdmin (ver la
// ruta). Como el comprobante es un respaldo contable, queda en la
// auditoría quién lo eliminó y qué era: los datos principales y el
// nombre del archivo, nunca su contenido.
export async function eliminarGasto(gastoId, empresasPermitidas, usuario) {
  const gasto = await buscarGasto(gastoId, empresasPermitidas);
  await db.gasto.delete({ where: { id: gastoId } });
  registrarEventoAuditoria({
    evento: "gasto_eliminado",
    usuarioId: usuario.id,
    usuario: usuario.usuario,
    gasto: {
      numero: gasto.id,
      empresa: gasto.empresa.slug,
      categoria: gasto.categoria.nombre,
      tipoComprobante: gasto.tipoComprobante ? gasto.tipoComprobante.toLowerCase() : null,
      proveedor: gasto.proveedor,
      rucProveedor: gasto.rucProveedor,
      monto: Number(gasto.monto),
      fecha: fecha(gasto.fecha),
      archivoNombre: gasto.archivoNombre,
    },
  });
  await borrarArchivoSiHuerfano(gasto.archivoUrl);
  return { ok: true };
}

export async function adjuntarComprobanteGasto(gastoId, archivoNombre, archivoUrl, empresasPermitidas) {
  const anterior = await buscarGasto(gastoId, empresasPermitidas);
  if (archivoUrl === anterior.archivoUrl) return serializar(anterior);
  await verificarArchivoSubido(archivoUrl);
  const actualizado = await db.gasto.update({
    where: { id: gastoId },
    data: { archivoNombre, archivoUrl },
    include: { empresa: true, categoria: true },
  });
  await borrarArchivoSiHuerfano(anterior.archivoUrl);
  return serializar(actualizado);
}
