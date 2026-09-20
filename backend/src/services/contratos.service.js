import { db } from "../lib/db.js";
import { buscarOCrearPersonal } from "./personal.service.js";
import { calcularEstado, formatearFecha, iniciales } from "../lib/estadoVencimiento.js";
import { ApiError, sinPermiso } from "../lib/errors.js";
import { empresasParaFiltro, verificarAccesoEmpresa } from "../lib/autorizacionEmpresa.js";

const TIPO_A_ENUM = { "Plazo fijo": "PLAZO_FIJO", "Indefinido": "INDEFINIDO" };
const TIPO_A_TEXTO = { PLAZO_FIJO: "Plazo fijo", INDEFINIDO: "Indefinido" };

function serializar(contrato) {
  return {
    id: contrato.id,
    trabajador: contrato.personal.nombre,
    dni: contrato.personal.dni,
    iniciales: iniciales(contrato.personal.nombre),
    empresa: contrato.empresa.slug,
    tipo: TIPO_A_TEXTO[contrato.tipo],
    vence: formatearFecha(contrato.fechaFin),
    estado: calcularEstado(contrato.fechaFin, contrato.diasAnticipacion, contrato.estadoManual),
    archivo: !!contrato.archivoNombre,
    ...(contrato.archivoUrl ? { archivoUrl: contrato.archivoUrl } : {}),
  };
}

async function buscarEmpresa(slug, empresasPermitidas) {
  verificarAccesoEmpresa(slug, empresasPermitidas);
  const empresa = await db.empresa.findUnique({ where: { slug } });
  if (!empresa) throw new ApiError(400, "VALIDACION", "Empresa inválida.");
  return empresa;
}

// Igual que en Equipos: un único punto de acceso al registro por id,
// que valida la empresa — lo usan actualizar() y adjuntarArchivo().
async function buscarContrato(contratoId, empresasPermitidas) {
  const contrato = await db.contrato.findUnique({ where: { id: contratoId }, include: { empresa: true } });
  if (!contrato) throw new ApiError(404, "NO_ENCONTRADO", "El contrato no existe.");
  if (!empresasPermitidas.includes(contrato.empresa.slug)) throw sinPermiso();
  return contrato;
}

export async function listarContratos({ empresa, estado, q }, empresasPermitidas) {
  const empresasFiltro = empresasParaFiltro(empresa, empresasPermitidas);
  const contratos = await db.contrato.findMany({
    where: {
      empresa: { slug: { in: empresasFiltro } },
      ...(q ? { personal: { OR: [{ nombre: { contains: q, mode: "insensitive" } }, { dni: { contains: q } }] } } : {}),
    },
    include: { personal: true, empresa: true },
    orderBy: { creadoEn: "desc" },
  });

  let resultado = contratos.map(serializar);
  // El estado se calcula al vuelo (ver calcularEstado), así que el
  // filtro por estado se aplica después de serializar, no en la
  // consulta SQL — no existe como columna filtrable directamente.
  if (estado) resultado = resultado.filter((c) => c.estado === estado);
  return resultado;
}

export async function crearContrato(datos, empresasPermitidas) {
  const empresa = await buscarEmpresa(datos.empresa, empresasPermitidas);
  const personal = await buscarOCrearPersonal(datos.dni, datos.trabajador);

  try {
    const creado = await db.contrato.create({
      data: {
        personalId: personal.id,
        empresaId: empresa.id,
        tipo: TIPO_A_ENUM[datos.tipo],
        fechaInicio: new Date(datos.fechaInicio),
        fechaFin: new Date(datos.fechaFin),
        diasAnticipacion: datos.diasAnticipacion ?? 30,
        archivoNombre: datos.archivoNombre || null,
        archivoUrl: datos.archivoUrl || null,
      },
      include: { personal: true, empresa: true },
    });
    return serializar(creado);
  } catch (err) {
    if (err.code === "P2002") {
      throw new ApiError(
        409,
        "CONTRATO_DUPLICADO",
        `${personal.nombre} ya tiene un contrato de tipo "${datos.tipo}" en esta empresa — edítalo en vez de crear uno nuevo.`
      );
    }
    throw err;
  }
}

export async function actualizarContrato(contratoId, datos, empresasPermitidas) {
  await buscarContrato(contratoId, empresasPermitidas);
  const empresa = await buscarEmpresa(datos.empresa, empresasPermitidas);
  const personal = await buscarOCrearPersonal(datos.dni, datos.trabajador);

  try {
    const actualizado = await db.contrato.update({
      where: { id: contratoId },
      data: {
        personalId: personal.id,
        empresaId: empresa.id,
        tipo: TIPO_A_ENUM[datos.tipo],
        fechaInicio: new Date(datos.fechaInicio),
        fechaFin: new Date(datos.fechaFin),
        diasAnticipacion: datos.diasAnticipacion ?? 30,
      },
      include: { personal: true, empresa: true },
    });
    return serializar(actualizado);
  } catch (err) {
    if (err.code === "P2002") {
      throw new ApiError(409, "CONTRATO_DUPLICADO", `${personal.nombre} ya tiene otro contrato de ese tipo en esa empresa.`);
    }
    throw err;
  }
}

export async function adjuntarArchivoContrato(contratoId, archivoNombre, archivoUrl, empresasPermitidas) {
  await buscarContrato(contratoId, empresasPermitidas);

  const actualizado = await db.contrato.update({
    where: { id: contratoId },
    data: { archivoNombre, archivoUrl },
    include: { personal: true, empresa: true },
  });
  return serializar(actualizado);
}

export async function eliminarContrato(contratoId, empresasPermitidas) {
  await buscarContrato(contratoId, empresasPermitidas);
  await db.contrato.delete({ where: { id: contratoId } });
  return { ok: true };
}
