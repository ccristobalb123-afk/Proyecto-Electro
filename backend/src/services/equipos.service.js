import { db } from "../lib/db.js";
import { formatearFecha } from "../lib/estadoVencimiento.js";
import { ApiError, validacionFallida } from "../lib/errors.js";
import { empresasParaFiltro, verificarAccesoEmpresa } from "../lib/autorizacionEmpresa.js";

const INCLUDE = { categoria: true, empresa: true, vehiculo: true };

function serializar(equipo) {
  return {
    id: equipo.id,
    codigo: equipo.codigo,
    categoria: equipo.categoria.nombre,
    empresa: equipo.empresa.slug,
    responsable: equipo.vehiculo ? `Camión ${equipo.vehiculo.placa}` : null,
    estado: equipo.estado.toLowerCase(),
    camposValores: equipo.camposValores,
    fotos: equipo.fotos,
    ...(equipo.comentarioMantenimiento ? { comentarioMantenimiento: equipo.comentarioMantenimiento } : {}),
    ...(equipo.ultimaInspeccion ? { ultInspeccion: formatearFecha(equipo.ultimaInspeccion) } : {}),
    ...(equipo.proximaInspeccion ? { proxInspeccion: formatearFecha(equipo.proximaInspeccion) } : {}),
  };
}

// Punto único de acceso a un equipo por id — lo usan TODAS las acciones
// (asignar, mantenimiento, baja, inspección, fotos, cambiar estado), así
// que este único chequeo de empresa las protege a todas de una vez: un
// usuario sin acceso a la empresa dueña del equipo nunca llega a
// tocarlo, ni sabiendo su id.
async function buscarEquipo(equipoId, empresasPermitidas) {
  const equipo = await db.equipo.findUnique({ where: { id: equipoId }, include: INCLUDE });
  if (!equipo) throw new ApiError(404, "NO_ENCONTRADO", "El equipo no existe.");
  verificarAccesoEmpresa(equipo.empresa.slug, empresasPermitidas);
  return equipo;
}

export async function listarEquipos({ empresa, categoria, estado, q }, empresasPermitidas) {
  const empresasFiltro = empresasParaFiltro(empresa, empresasPermitidas);
  const equipos = await db.equipo.findMany({
    where: {
      empresa: { slug: { in: empresasFiltro } },
      ...(categoria ? { categoria: { nombre: categoria } } : {}),
      ...(estado ? { estado: estado.toUpperCase() } : {}),
      ...(q
        ? {
            OR: [
              { codigo: { contains: q, mode: "insensitive" } },
              { categoria: { nombre: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: INCLUDE,
    orderBy: { creadoEn: "desc" },
  });
  return equipos.map(serializar);
}

export async function crearEquipo({ codigo, categoria, empresa, camposValores, fotos }, empresasPermitidas, usuarioId) {
  verificarAccesoEmpresa(empresa, empresasPermitidas);

  const codigoLimpio = codigo.trim();
  const yaExiste = await db.equipo.findUnique({ where: { codigo: codigoLimpio } });
  if (yaExiste) throw new ApiError(409, "CODIGO_DUPLICADO", "Ese código ya existe. Usa otro.");

  const categoriaRow = await db.categoriaEquipo.findUnique({ where: { nombre: categoria } });
  if (!categoriaRow) throw validacionFallida("La categoría indicada no existe.");

  const empresaRow = await db.empresa.findUnique({ where: { slug: empresa } });
  if (!empresaRow) throw validacionFallida("Empresa inválida.");

  // El registro del equipo y su primera línea de historial son un solo
  // hecho de negocio ("se dio de alta") — si el historial fallara por
  // cualquier motivo, no queremos un equipo fantasma sin rastro alguno.
  const nuevo = await db.$transaction(async (tx) => {
    const creado = await tx.equipo.create({
      data: {
        codigo: codigoLimpio,
        categoriaId: categoriaRow.id,
        empresaId: empresaRow.id,
        camposValores: camposValores || {},
        fotos: (fotos || []).filter(Boolean),
      },
      include: INCLUDE,
    });
    await tx.historialEquipo.create({ data: { equipoId: creado.id, titulo: "Registrado en el sistema", usuarioId } });
    return creado;
  });

  return serializar(nuevo);
}

export async function actualizarFotosEquipo(equipoId, fotos, empresasPermitidas) {
  await buscarEquipo(equipoId, empresasPermitidas);
  const actualizado = await db.equipo.update({
    where: { id: equipoId },
    data: { fotos: (fotos || []).filter(Boolean) },
    include: INCLUDE,
  });
  return serializar(actualizado);
}

// Edita los datos base (código, categoría, campos personalizados) —
// antes solo existían las acciones de flujo (asignar, mantenimiento,
// baja...), pero no había forma de corregir un error de tipeo en el
// código sin borrar y volver a crear el equipo entero.
export async function actualizarEquipo(equipoId, { codigo, categoria, camposValores }, empresasPermitidas, usuarioId) {
  await buscarEquipo(equipoId, empresasPermitidas);

  const codigoLimpio = codigo.trim();
  const otroConEseCodigo = await db.equipo.findUnique({ where: { codigo: codigoLimpio } });
  if (otroConEseCodigo && otroConEseCodigo.id !== equipoId) {
    throw new ApiError(409, "CODIGO_DUPLICADO", "Ese código ya lo usa otro equipo.");
  }

  const categoriaRow = await db.categoriaEquipo.findUnique({ where: { nombre: categoria } });
  if (!categoriaRow) throw validacionFallida("La categoría indicada no existe.");

  const actualizado = await db.$transaction(async (tx) => {
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: { codigo: codigoLimpio, categoriaId: categoriaRow.id, camposValores: camposValores || {} },
      include: INCLUDE,
    });
    await tx.historialEquipo.create({ data: { equipoId, titulo: "Datos actualizados", usuarioId } });
    return act;
  });

  return serializar(actualizado);
}

// Solo se puede borrar un equipo que nunca tuvo actividad real (nadie
// lo asignó, mandó a mantenimiento, etc. — solo su registro inicial) —
// para cualquier otro caso, "Dar de baja" es la forma correcta de
// retirarlo sin perder su historial.
export async function eliminarEquipo(equipoId, empresasPermitidas) {
  const equipo = await buscarEquipo(equipoId, empresasPermitidas);
  const eventosDeHistorial = await db.historialEquipo.count({ where: { equipoId } });
  if (eventosDeHistorial > 1) {
    throw validacionFallida("Este equipo ya tiene actividad registrada — usa \"Dar de baja\" en vez de eliminarlo.");
  }
  await db.equipo.delete({ where: { id: equipoId } });
  return { ok: true };
}

// Transiciones "simples" (disponible/vencido) — asignar y mantenimiento
// tienen su propio flujo obligatorio (ver asignarEquipo/enviarAMantenimiento)
// porque cada uno exige datos adicionales que acá no llegan.
export async function cambiarEstadoEquipo(equipoId, estado, empresasPermitidas) {
  if (estado === "asignado") {
    throw validacionFallida("Para asignar un equipo hay que elegir un camión registrado.");
  }
  if (estado === "mantenimiento") {
    throw validacionFallida("Para enviar a mantenimiento hay que indicar qué tiene el equipo.");
  }

  await buscarEquipo(equipoId, empresasPermitidas);
  const actualizado = await db.equipo.update({
    where: { id: equipoId },
    data: { estado: estado.toUpperCase() },
    include: INCLUDE,
  });
  return serializar(actualizado);
}

export async function asignarEquipo(equipoId, vehiculoId, empresasPermitidas, usuarioId) {
  const equipo = await buscarEquipo(equipoId, empresasPermitidas);

  if (equipo.estado === "VENCIDO" || equipo.estado === "DEBAJA") {
    throw validacionFallida("Un equipo vencido o de baja no se puede asignar.");
  }

  const vehiculo = await db.vehiculo.findUnique({ where: { id: vehiculoId } });
  if (!vehiculo) throw validacionFallida("El camión indicado no existe.");
  if (vehiculo.empresaDuenaId !== equipo.empresaId) {
    throw validacionFallida("Solo se puede asignar a un camión de la misma empresa.");
  }

  const actualizado = await db.$transaction(async (tx) => {
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: { estado: "ASIGNADO", vehiculoId: vehiculo.id },
      include: INCLUDE,
    });
    await tx.historialEquipo.create({
      data: { equipoId, titulo: `Asignado a Camión ${vehiculo.placa}`, tono: "success", usuarioId },
    });
    return act;
  });

  return serializar(actualizado);
}

export async function enviarAMantenimiento(equipoId, comentario, empresasPermitidas, usuarioId) {
  await buscarEquipo(equipoId, empresasPermitidas);

  const actualizado = await db.$transaction(async (tx) => {
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: { estado: "MANTENIMIENTO", vehiculoId: null, comentarioMantenimiento: comentario },
      include: INCLUDE,
    });
    await tx.historialEquipo.create({ data: { equipoId, titulo: "Enviado a mantenimiento", tono: "volt", usuarioId } });
    return act;
  });

  return serializar(actualizado);
}

export async function devolverEquipo(equipoId, empresasPermitidas, usuarioId) {
  await buscarEquipo(equipoId, empresasPermitidas);

  const actualizado = await db.$transaction(async (tx) => {
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: { estado: "DISPONIBLE", vehiculoId: null },
      include: INCLUDE,
    });
    await tx.historialEquipo.create({ data: { equipoId, titulo: "Devuelto — sin responsable actual", usuarioId } });
    return act;
  });

  return serializar(actualizado);
}

export async function darDeBajaEquipo(equipoId, motivo, empresasPermitidas, usuarioId) {
  await buscarEquipo(equipoId, empresasPermitidas);

  const actualizado = await db.$transaction(async (tx) => {
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: { estado: "DEBAJA", motivoBaja: motivo, vehiculoId: null },
      include: INCLUDE,
    });
    await tx.historialEquipo.create({ data: { equipoId, titulo: `Dado de baja — ${motivo}`, usuarioId } });
    return act;
  });

  return serializar(actualizado);
}

// Antes el frontend hacía 2 llamadas separadas (registrar la inspección
// y después cambiar el estado según el resultado) — eso deja una
// ventana donde podrían quedar desincronizadas si la segunda falla.
// Ahora es una sola operación atómica del lado del backend, y además
// dentro de una transacción real (update + historial juntos).
export async function registrarInspeccion(equipoId, { tipo, fechaInspeccion, fechaVencimiento, resultado }, empresasPermitidas, usuarioId) {
  await buscarEquipo(equipoId, empresasPermitidas);
  const aprobado = resultado === "aprobado";
  const etiquetaResultado = { aprobado: "Aprobado", observado: "Observado", rechazado: "Rechazado" }[resultado];

  const actualizado = await db.$transaction(async (tx) => {
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: {
        estado: aprobado ? "DISPONIBLE" : "MANTENIMIENTO",
        ultimaInspeccion: new Date(fechaInspeccion),
        proximaInspeccion: new Date(fechaVencimiento),
      },
      include: INCLUDE,
    });
    await tx.historialEquipo.create({
      data: {
        equipoId,
        titulo: `Inspección ${tipo === "interna" ? "interna" : "externa"} — ${etiquetaResultado}`,
        tono: aprobado ? "success" : "volt",
        usuarioId,
      },
    });
    return act;
  });

  return serializar(actualizado);
}

export async function obtenerHojaDeVida(codigo, empresasPermitidas) {
  const equipo = await db.equipo.findUnique({
    where: { codigo },
    include: { historial: { orderBy: { creadoEn: "desc" }, include: { usuario: true } }, empresa: true },
  });
  if (!equipo) return [];
  verificarAccesoEmpresa(equipo.empresa.slug, empresasPermitidas);

  return equipo.historial.map((h) => ({
    titulo: h.titulo,
    fecha: formatearFecha(h.creadoEn),
    actor: h.usuario?.nombre || "Sistema",
    ...(h.tono ? { tone: h.tono } : {}),
  }));
}
