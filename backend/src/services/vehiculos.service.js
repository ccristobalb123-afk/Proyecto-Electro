import { db } from "../lib/db.js";
import { calcularEstadoDocumento } from "../lib/estadoDocumento.js";
import { formatearFecha } from "../lib/estadoVencimiento.js";
import { ApiError, validacionFallida, sinPermiso } from "../lib/errors.js";
import { verificarAccesoEmpresa } from "../lib/autorizacionEmpresa.js";

const DOCS_BASE = ["SOAT", "Revisión técnica", "Tarjeta de circulación", "Seguro", "Permiso de operación"];

const TIPO_A_ENUM = { Camioneta: "CAMIONETA", "Camión": "CAMION", Minivan: "MINIVAN", "Grúa": "GRUA", Auto: "AUTO" };
const ENUM_A_TIPO = { CAMIONETA: "Camioneta", CAMION: "Camión", MINIVAN: "Minivan", GRUA: "Grúa", AUTO: "Auto" };

const INCLUDE = { empresaDuena: true, empresaUso: true, documentos: true };

function serializarDocumento(doc) {
  const { dias, estado } = calcularEstadoDocumento(doc.fechaVencimiento);
  return {
    id: doc.id,
    tipo: doc.tipo,
    dias,
    estado,
    archivo: !!doc.archivoNombre,
    ...(doc.archivoNombre ? { archivoNombre: doc.archivoNombre } : {}),
    ...(doc.archivoUrl ? { archivoUrl: doc.archivoUrl } : {}),
  };
}

function serializar(vehiculo) {
  return {
    id: vehiculo.id,
    placa: vehiculo.placa,
    tipoUnidad: ENUM_A_TIPO[vehiculo.tipoUnidad],
    "empresaDueña": vehiculo.empresaDuena.slug,
    empresaUso: vehiculo.empresaUso.slug,
    cuadrilla: vehiculo.cuadrilla,
    documentos: vehiculo.documentos.map(serializarDocumento),
  };
}

async function agregarHistorial(vehiculoId, titulo, tono = null) {
  await db.historialVehiculo.create({ data: { vehiculoId, titulo, tono } });
}

// Un camión puede ser DUEÑO de una empresa pero estar en USO de la
// otra (ej. DEF-456 del seed: dueña ElectroSAC, en uso por CorevexSAC)
// — por eso el acceso se concede si el usuario pertenece a
// CUALQUIERA de las dos, no solo a la dueña.
function tieneAccesoAlVehiculo(vehiculo, empresasPermitidas) {
  return empresasPermitidas.includes(vehiculo.empresaDuena.slug) || empresasPermitidas.includes(vehiculo.empresaUso.slug);
}

async function buscarVehiculo(vehiculoId, empresasPermitidas) {
  const vehiculo = await db.vehiculo.findUnique({ where: { id: vehiculoId }, include: INCLUDE });
  if (!vehiculo) throw new ApiError(404, "NO_ENCONTRADO", "El vehículo no existe.");
  if (!tieneAccesoAlVehiculo(vehiculo, empresasPermitidas)) throw sinPermiso();
  return vehiculo;
}

export async function listarVehiculos({ empresa, tipoUnidad, q }, empresasPermitidas) {
  if (empresa && !empresasPermitidas.includes(empresa)) throw sinPermiso();

  // Sin filtro explícito: solo camiones donde el usuario tiene algo que
  // ver, ya sea porque su empresa es la dueña o porque lo usa.
  const filtroEmpresa = empresa
    ? { OR: [{ empresaDuena: { slug: empresa } }, { empresaUso: { slug: empresa } }] }
    : { OR: [{ empresaDuena: { slug: { in: empresasPermitidas } } }, { empresaUso: { slug: { in: empresasPermitidas } } }] };

  const vehiculos = await db.vehiculo.findMany({
    where: {
      ...filtroEmpresa,
      ...(tipoUnidad ? { tipoUnidad: TIPO_A_ENUM[tipoUnidad] } : {}),
      ...(q ? { placa: { contains: q, mode: "insensitive" } } : {}),
    },
    include: INCLUDE,
    orderBy: { creadoEn: "desc" },
  });
  return vehiculos.map(serializar);
}

export async function crearVehiculo({ placa, tipoUnidad, empresa, cuadrilla }, empresasPermitidas, usuarioId) {
  verificarAccesoEmpresa(empresa, empresasPermitidas);

  const placaLimpia = placa.trim().toUpperCase();
  const yaExiste = await db.vehiculo.findUnique({ where: { placa: placaLimpia } });
  if (yaExiste) throw new ApiError(409, "PLACA_DUPLICADA", "Ya existe un vehículo con esa placa.");

  const empresaRow = await db.empresa.findUnique({ where: { slug: empresa } });
  if (!empresaRow) throw validacionFallida("Empresa inválida.");

  const tiposDocumento = [...DOCS_BASE, ...(tipoUnidad === "Grúa" ? ["Brazo hidráulico"] : [])];

  const nuevo = await db.$transaction(async (tx) => {
    const creado = await tx.vehiculo.create({
      data: {
        placa: placaLimpia,
        tipoUnidad: TIPO_A_ENUM[tipoUnidad],
        empresaDuenaId: empresaRow.id,
        empresaUsoId: empresaRow.id,
        cuadrilla: cuadrilla || null,
        // Siempre arranca con los documentos base sin adjuntar — antes
        // esto quedaba en [] para vehículos que no son Grúa, así que el
        // modal de Documentos no tenía ninguna fila donde adjuntar nada
        // recién creado el vehículo.
        documentos: { create: tiposDocumento.map((tipo) => ({ tipo })) },
      },
      include: INCLUDE,
    });
    await tx.historialVehiculo.create({ data: { vehiculoId: creado.id, titulo: "Registrado en el sistema", usuarioId } });
    return creado;
  });

  return serializar(nuevo);
}

// El documento se identifica por su id real (una fila de
// DocumentoVehiculo), no por posición en el array — la posición puede
// cambiar de orden, el id nunca.
export async function actualizarDocumento(vehiculoId, documentoId, { archivoNombre, archivoUrl, fechaVencimiento }, empresasPermitidas) {
  await buscarVehiculo(vehiculoId, empresasPermitidas);

  const documento = await db.documentoVehiculo.findUnique({ where: { id: documentoId } });
  if (!documento || documento.vehiculoId !== vehiculoId) {
    throw new ApiError(404, "NO_ENCONTRADO", "Ese documento no existe para este vehículo.");
  }

  await db.documentoVehiculo.update({
    where: { id: documentoId },
    data: {
      ...(archivoNombre ? { archivoNombre } : {}),
      ...(archivoUrl ? { archivoUrl } : {}),
      ...(fechaVencimiento ? { fechaVencimiento: new Date(fechaVencimiento) } : {}),
    },
  });

  const vehiculo = await db.vehiculo.findUnique({ where: { id: vehiculoId }, include: INCLUDE });
  return serializar(vehiculo);
}

// Solo se editan placa y cuadrilla — el tipo de unidad no, porque
// determina qué documentos existen para este vehículo (una Grúa tiene
// "Brazo hidráulico" además de los 5 documentos base) y cambiarlo
// dejaría documentos huérfanos o faltantes; la empresa tampoco, por la
// misma razón que en Equipos (es una decisión de negocio, no una
// corrección de datos).
export async function actualizarVehiculo(vehiculoId, { placa, cuadrilla }, empresasPermitidas, usuarioId) {
  await buscarVehiculo(vehiculoId, empresasPermitidas);

  const placaLimpia = placa.trim().toUpperCase();
  const otroConEsaPlaca = await db.vehiculo.findUnique({ where: { placa: placaLimpia } });
  if (otroConEsaPlaca && otroConEsaPlaca.id !== vehiculoId) {
    throw new ApiError(409, "PLACA_DUPLICADA", "Esa placa ya la usa otro vehículo.");
  }

  const actualizado = await db.vehiculo.update({
    where: { id: vehiculoId },
    data: { placa: placaLimpia, cuadrilla: cuadrilla || null },
    include: INCLUDE,
  });
  await agregarHistorial(vehiculoId, "Datos actualizados", null);
  return serializar(actualizado);
}

// Solo se puede borrar un vehículo que nunca tuvo actividad real (ni
// documentos adjuntos, ni equipos asignados) — para cualquier otro
// caso no hay un equivalente a "dar de baja" todavía, así que por
// ahora simplemente no se deja borrar (evita perder historial real).
export async function eliminarVehiculo(vehiculoId, empresasPermitidas) {
  const vehiculo = await buscarVehiculo(vehiculoId, empresasPermitidas);

  const equiposAsignados = await db.equipo.count({ where: { vehiculoId } });
  if (equiposAsignados > 0) {
    throw validacionFallida(`Hay ${equiposAsignados} equipo(s) asignado(s) a este vehículo — reasígnalos antes de eliminarlo.`);
  }
  const documentosConArchivo = vehiculo.documentos.filter((d) => d.archivoNombre).length;
  if (documentosConArchivo > 0) {
    throw validacionFallida("Este vehículo ya tiene documentos adjuntos — no se puede eliminar.");
  }

  await db.vehiculo.delete({ where: { id: vehiculoId } });
  return { ok: true };
}

export async function obtenerHistorial(placa, empresasPermitidas) {
  const vehiculo = await db.vehiculo.findUnique({
    where: { placa },
    include: { historial: { orderBy: { creadoEn: "desc" }, include: { usuario: true } }, empresaDuena: true, empresaUso: true },
  });
  if (!vehiculo) return [];
  if (!tieneAccesoAlVehiculo(vehiculo, empresasPermitidas)) throw sinPermiso();

  return vehiculo.historial.map((h) => ({
    titulo: h.titulo,
    fecha: formatearFecha(h.creadoEn),
    actor: h.usuario?.nombre || "Sistema",
    ...(h.tono ? { tone: h.tono } : {}),
  }));
}
