import { db } from "../lib/db.js";
import { formatearFecha } from "../lib/estadoVencimiento.js";
import { ApiError, validacionFallida, sinPermiso, conflicto } from "../lib/errors.js";
import { verificarAccesoEmpresa } from "../lib/autorizacionEmpresa.js";
import { borrarArchivoSiHuerfano } from "../lib/archivos.js";
import { CLAVES_DOCUMENTO, infoDocumento, nombreDocumento, estadoDocumento } from "../lib/documentosVehiculo.js";

const TIPO_A_ENUM = { Camioneta: "CAMIONETA", "Camión": "CAMION", Minivan: "MINIVAN", "Grúa": "GRUA", Auto: "AUTO" };
export const ENUM_A_TIPO = { CAMIONETA: "Camioneta", CAMION: "Camión", MINIVAN: "Minivan", GRUA: "Grúa", AUTO: "Auto" };

const INCLUDE = { empresaDuena: true, empresaUso: true, documentos: true };

const aFechaIso = (fecha) => (fecha ? new Date(fecha).toISOString().slice(0, 10) : null);
const aFecha = (texto) => (texto ? new Date(texto) : null);

function serializarDocumento(doc) {
  const { dias, estado } = estadoDocumento(doc);
  return {
    id: doc.id,
    tipo: doc.tipoDocumento, // clave del catálogo; null = sistema anterior
    nombre: nombreDocumento(doc),
    legado: !doc.tipoDocumento,
    vence: doc.tipoDocumento ? infoDocumento(doc.tipoDocumento).vence : true,
    fechaEmision: aFechaIso(doc.fechaEmision),
    fechaVencimiento: aFechaIso(doc.fechaVencimiento),
    diasAnticipacion: doc.diasAnticipacion,
    dias,
    estado, // vigente | porvencer | vencido | sinfecha | novence
    archivo: !!doc.archivoUrl,
    ...(doc.archivoNombre ? { archivoNombre: doc.archivoNombre } : {}),
    ...(doc.archivoUrl ? { archivoUrl: doc.archivoUrl } : {}),
  };
}

const ordenCatalogo = (doc) => CLAVES_DOCUMENTO.indexOf(doc.tipoDocumento);

function serializar(vehiculo) {
  const delCatalogo = vehiculo.documentos.filter((d) => d.tipoDocumento).sort((a, b) => ordenCatalogo(a) - ordenCatalogo(b));
  const anteriores = vehiculo.documentos.filter((d) => !d.tipoDocumento).sort((a, b) => a.id - b.id);
  return {
    id: vehiculo.id,
    placa: vehiculo.placa,
    tipoUnidad: ENUM_A_TIPO[vehiculo.tipoUnidad],
    "empresaDueña": vehiculo.empresaDuena.slug,
    empresaUso: vehiculo.empresaUso.slug,
    cuadrilla: vehiculo.cuadrilla,
    // Solo los documentos que se marcaron como aplicables.
    documentos: delCatalogo.map(serializarDocumento),
    // Del sistema anterior sin equivalente en el catálogo (ej. "Permiso
    // de operación"): se muestran aparte, con su archivo si lo tienen.
    documentosAnteriores: anteriores.map(serializarDocumento),
  };
}

// El Brazo Hidráulico es de grúas: solo se puede AGREGAR a una grúa.
// Si una fila ya existía (datos del sistema anterior), se deja editar.
function validarDocumentosParaUnidad(tipoUnidadEnum, documentos, clavesExistentes = new Set()) {
  for (const d of documentos) {
    if (infoDocumento(d.tipo)?.soloGrua && tipoUnidadEnum !== "GRUA" && !clavesExistentes.has(d.tipo)) {
      throw validacionFallida(`El documento "${infoDocumento(d.tipo).nombre}" solo aplica a grúas.`);
    }
  }
}

function datosDocumento(d, existente) {
  return {
    fechaEmision: aFecha(d.fechaEmision),
    fechaVencimiento: aFecha(d.fechaVencimiento),
    diasAnticipacion: d.diasAnticipacion ?? existente?.diasAnticipacion ?? 30,
    // El archivo solo se reemplaza si llegó uno nuevo.
    ...(d.archivoUrl ? { archivoUrl: d.archivoUrl, archivoNombre: d.archivoNombre || "documento" } : {}),
  };
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

export async function crearVehiculo({ placa, tipoUnidad, empresa, cuadrilla, documentos = [] }, empresasPermitidas, usuarioId) {
  verificarAccesoEmpresa(empresa, empresasPermitidas);

  const placaLimpia = placa.trim().toUpperCase();
  const yaExiste = await db.vehiculo.findUnique({ where: { placa: placaLimpia } });
  if (yaExiste) throw new ApiError(409, "PLACA_DUPLICADA", "Ya existe un vehículo con esa placa.");

  const empresaRow = await db.empresa.findUnique({ where: { slug: empresa } });
  if (!empresaRow) throw validacionFallida("Empresa inválida.");

  validarDocumentosParaUnidad(TIPO_A_ENUM[tipoUnidad], documentos);

  const nuevo = await db.$transaction(async (tx) => {
    const creado = await tx.vehiculo.create({
      data: {
        placa: placaLimpia,
        tipoUnidad: TIPO_A_ENUM[tipoUnidad],
        empresaDuenaId: empresaRow.id,
        empresaUsoId: empresaRow.id,
        cuadrilla: cuadrilla || null,
        // Solo los documentos que se marcaron como aplicables — antes se
        // creaban siempre 5 "base" vacíos, apliquen o no al vehículo.
        documentos: {
          create: documentos.map((d) => ({ tipoDocumento: d.tipo, tipo: infoDocumento(d.tipo).nombre, ...datosDocumento(d) })),
        },
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
export async function actualizarDocumento(vehiculoId, documentoId, datos, empresasPermitidas) {
  await buscarVehiculo(vehiculoId, empresasPermitidas);

  const documento = await db.documentoVehiculo.findUnique({ where: { id: documentoId } });
  if (!documento || documento.vehiculoId !== vehiculoId) {
    throw new ApiError(404, "NO_ENCONTRADO", "Ese documento no existe para este vehículo.");
  }

  // Lo que no llega se conserva; la coherencia de fechas se revisa con
  // el resultado final (ej. solo se cambia el vencimiento).
  const emision = datos.fechaEmision !== undefined ? aFecha(datos.fechaEmision) : documento.fechaEmision;
  const vencimiento = datos.fechaVencimiento !== undefined ? aFecha(datos.fechaVencimiento) : documento.fechaVencimiento;
  if (emision && vencimiento && vencimiento < emision) {
    throw validacionFallida("La fecha de vencimiento no puede ser anterior a la de inspección o emisión.");
  }

  await db.documentoVehiculo.update({
    where: { id: documentoId },
    data: {
      ...(datos.archivoUrl ? { archivoUrl: datos.archivoUrl, archivoNombre: datos.archivoNombre || "documento" } : {}),
      ...(datos.fechaEmision !== undefined ? { fechaEmision: emision } : {}),
      ...(datos.fechaVencimiento !== undefined ? { fechaVencimiento: vencimiento } : {}),
      ...(datos.diasAnticipacion !== undefined ? { diasAnticipacion: datos.diasAnticipacion } : {}),
    },
  });
  // Si se reemplazó el archivo, el anterior ya no lo usa nadie.
  if (datos.archivoUrl && documento.archivoUrl && documento.archivoUrl !== datos.archivoUrl) {
    await borrarArchivoSiHuerfano(documento.archivoUrl);
  }

  const vehiculo = await db.vehiculo.findUnique({ where: { id: vehiculoId }, include: INCLUDE });
  return serializar(vehiculo);
}

// Se editan placa, cuadrilla y qué documentos aplican. El tipo de
// unidad no (una grúa puede tener Brazo Hidráulico y otro tipo no), y
// la empresa tampoco, por la misma razón que en Equipos (es una
// decisión de negocio, no una corrección de datos).
export async function actualizarVehiculo(vehiculoId, { placa, cuadrilla, documentos }, empresasPermitidas, usuarioId) {
  const vehiculo = await buscarVehiculo(vehiculoId, empresasPermitidas);

  const placaLimpia = placa.trim().toUpperCase();
  const otroConEsaPlaca = await db.vehiculo.findUnique({ where: { placa: placaLimpia } });
  if (otroConEsaPlaca && otroConEsaPlaca.id !== vehiculoId) {
    throw new ApiError(409, "PLACA_DUPLICADA", "Esa placa ya la usa otro vehículo.");
  }

  const actuales = vehiculo.documentos.filter((d) => d.tipoDocumento);
  const porClave = new Map(actuales.map((d) => [d.tipoDocumento, d]));
  if (documentos) validarDocumentosParaUnidad(vehiculo.tipoUnidad, documentos, new Set(porClave.keys()));

  const archivosLiberados = [];
  const cambios = [];
  const actualizado = await db.$transaction(async (tx) => {
    if (documentos) {
      // `documentos` es la lista completa de los que aplican: los del
      // catálogo que ya no vienen se desmarcaron. Los del sistema
      // anterior no se tocan desde acá.
      const claves = new Set(documentos.map((d) => d.tipo));
      for (const quitado of actuales.filter((d) => !claves.has(d.tipoDocumento))) {
        await tx.documentoVehiculo.delete({ where: { id: quitado.id } });
        if (quitado.archivoUrl) archivosLiberados.push(quitado.archivoUrl);
        cambios.push(`−${nombreDocumento(quitado)}`);
      }
      for (const d of documentos) {
        const existente = porClave.get(d.tipo);
        if (existente) {
          await tx.documentoVehiculo.update({ where: { id: existente.id }, data: datosDocumento(d, existente) });
          if (d.archivoUrl && existente.archivoUrl && existente.archivoUrl !== d.archivoUrl) archivosLiberados.push(existente.archivoUrl);
        } else {
          await tx.documentoVehiculo.create({
            data: { vehiculoId, tipoDocumento: d.tipo, tipo: infoDocumento(d.tipo).nombre, ...datosDocumento(d) },
          });
          cambios.push(`+${infoDocumento(d.tipo).nombre}`);
        }
      }
    }
    const v = await tx.vehiculo.update({
      where: { id: vehiculoId },
      data: { placa: placaLimpia, cuadrilla: cuadrilla || null },
      include: INCLUDE,
    });
    await tx.historialVehiculo.create({
      data: { vehiculoId, usuarioId, titulo: cambios.length ? `Datos actualizados (documentos: ${cambios.join(", ")})` : "Datos actualizados" },
    });
    return v;
  });

  // Fuera de la transacción: el archivo se borra solo si ya quedó libre.
  for (const url of archivosLiberados) await borrarArchivoSiHuerfano(url);
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
    throw conflicto(`No se puede eliminar el vehículo ${vehiculo.placa}: tiene ${equiposAsignados} ${equiposAsignados === 1 ? "equipo asignado" : "equipos asignados"}. Reasígnalos o devuélvelos al almacén primero.`, "VEHICULO_CON_EQUIPOS");
  }
  const documentosConArchivo = vehiculo.documentos.filter((d) => d.archivoNombre).length;
  if (documentosConArchivo > 0) {
    throw conflicto(`No se puede eliminar el vehículo ${vehiculo.placa}: ya tiene ${documentosConArchivo} ${documentosConArchivo === 1 ? "documento adjunto" : "documentos adjuntos"} (SOAT, revisión técnica...) que se perderían.`, "VEHICULO_CON_DOCUMENTOS");
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
