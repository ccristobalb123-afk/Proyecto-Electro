import { db } from "../lib/db.js";
import { formatearFecha, formatearFechaDia } from "../lib/estadoVencimiento.js";
import { ApiError, validacionFallida, conflicto } from "../lib/errors.js";
import { empresasParaFiltro, verificarAccesoEmpresa } from "../lib/autorizacionEmpresa.js";
import { camposDelTipo, ETIQUETAS_CAMPO, nombreCategoria, tipoPorNombre, ORDEN_TIPOS, TIPOS_EQUIPO } from "../lib/tiposEquipo.js";

const INCLUDE = { categoria: true, empresa: true, vehiculo: true };

// "2026-10-16" de una columna DATE (medianoche UTC) — sin desfase de día.
const isoDia = (fecha) => (fecha ? new Date(fecha).toISOString().slice(0, 10) : null);

/** Hoy en Perú como "AAAA-MM-DD", sin depender de la zona del servidor. */
export function hoyEnPeru() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
}

// Valor de un campo tal como está guardado (las fechas de inspección viven
// en ultima_inspeccion / proxima_inspeccion, las mismas que actualiza el
// checklist pre-uso y de las que salen los avisos).
function valorGuardado(equipo, campo) {
  if (campo === "fechaInspeccion") return equipo.ultimaInspeccion;
  if (campo === "fechaVencimiento") return equipo.proximaInspeccion;
  return equipo[campo];
}

/** Lo que se muestra para identificar al equipo: su Código o, si no tiene, su Serial. */
export function identificadorEquipo(equipo) {
  return equipo.codigo || equipo.serial || `Equipo #${equipo.id}`;
}

function serializar(equipo) {
  const tipo = equipo.categoria.tipo;
  const campos = camposDelTipo(tipo);
  return {
    id: equipo.id,
    identificador: identificadorEquipo(equipo),
    codigo: equipo.codigo,
    categoria: nombreCategoria(equipo.categoria),
    tipo,
    empresa: equipo.empresa.slug,
    responsable: equipo.vehiculo ? `Camión ${equipo.vehiculo.placa}` : null,
    estado: equipo.estado.toLowerCase(),
    marca: equipo.marca,
    serial: equipo.serial,
    pasos: equipo.pasos,
    talla: equipo.talla,
    lote: equipo.lote,
    fechaFabricacion: equipo.fechaFabricacion ? formatearFechaDia(equipo.fechaFabricacion) : null,
    fechaFabricacionIso: isoDia(equipo.fechaFabricacion),
    // Obligatorios de su tipo que este equipo todavía no tiene (equipos
    // registrados antes de esta versión): se muestran con "—" y se piden
    // al editarlo.
    faltantes: campos ? campos.filter((c) => valorGuardado(equipo, c) == null || valorGuardado(equipo, c) === "").map((c) => ETIQUETAS_CAMPO[c]) : [],
    // Campos libres: solo en categorías antiguas sin tipo.
    camposValores: campos ? {} : equipo.camposValores,
    fotos: equipo.fotos,
    ...(equipo.comentarioMantenimiento ? { comentarioMantenimiento: equipo.comentarioMantenimiento } : {}),
    ...(equipo.ultimaInspeccion ? { ultInspeccion: formatearFechaDia(equipo.ultimaInspeccion) } : {}),
    ...(equipo.proximaInspeccion ? { proxInspeccion: formatearFechaDia(equipo.proximaInspeccion) } : {}),
    ultInspeccionIso: isoDia(equipo.ultimaInspeccion),
    proxInspeccionIso: isoDia(equipo.proximaInspeccion),
    diasAnticipacionInspeccion: equipo.diasAnticipacionInspeccion,
  };
}

/** Categoría por su nombre visible (el de la tabla) o, si es antigua, por su nombre en la base. */
async function buscarCategoria(nombre) {
  const tipo = tipoPorNombre(nombre);
  return tipo ? db.categoriaEquipo.findUnique({ where: { tipo } }) : db.categoriaEquipo.findUnique({ where: { nombre } });
}

// ---- Datos según el tipo ----
const fechaValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;

/**
 * Arma los datos a guardar según el tipo de la categoría: exige los
 * campos que el tipo pide y deja en NULL los que no le corresponden
 * (aunque lleguen en el pedido). Lanza 400 con un mensaje claro.
 */
function datosSegunTipo(categoriaRow, body) {
  const campos = camposDelTipo(categoriaRow.tipo);
  const data = { codigo: null, marca: null, serial: null, pasos: null, talla: null, lote: null, fechaFabricacion: null };
  const faltan = [];
  const texto = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

  for (const campo of campos) {
    const valor = texto(body[campo]);
    if (!valor) {
      faltan.push(ETIQUETAS_CAMPO[campo]);
      continue;
    }
    if (campo === "codigo" || campo === "serial" || campo === "talla" || campo === "lote") {
      data[campo] = valor.toUpperCase();
    } else if (campo === "pasos") {
      if (!/^\d{1,3}$/.test(valor) || Number(valor) < 1) throw validacionFallida("Pasos debe ser un número entero mayor que 0.");
      data.pasos = Number(valor);
    } else if (campo.startsWith("fecha")) {
      if (!fechaValida(valor)) throw validacionFallida(`${ETIQUETAS_CAMPO[campo]}: fecha inválida.`);
      data[campo] = valor;
    } else {
      data[campo] = valor;
    }
  }
  if (faltan.length) {
    throw validacionFallida(`Completa ${faltan.length === 1 ? "el campo" : "los campos"} obligatorio${faltan.length === 1 ? "" : "s"}: ${faltan.join(", ")}.`);
  }

  // Fechas: el vencimiento no puede ser antes de la inspección, y la
  // fabricación no puede ser futura (hoy en Perú). Se comparan como texto
  // AAAA-MM-DD: sin horas ni zonas que corran el día.
  if (data.fechaVencimiento < data.fechaInspeccion) {
    throw validacionFallida("La fecha de vencimiento no puede ser anterior a la fecha de inspección.");
  }
  if (data.fechaFabricacion && data.fechaFabricacion > hoyEnPeru()) {
    throw validacionFallida("La fecha de fabricación no puede ser futura.");
  }

  const { fechaInspeccion, fechaVencimiento, fechaFabricacion, ...resto } = data;
  return {
    ...resto,
    fechaFabricacion: fechaFabricacion ? new Date(fechaFabricacion) : null,
    ultimaInspeccion: new Date(fechaInspeccion),
    proximaInspeccion: new Date(fechaVencimiento),
  };
}

// Código y Serial no se repiten dentro del mismo tipo (se guardan en
// mayúsculas, así "abc-1" y "ABC-1" chocan igual).
async function verificarUnicos(categoriaRow, data, excluirId = null) {
  for (const campo of ["codigo", "serial"]) {
    if (!data[campo]) continue;
    const otro = await db.equipo.findFirst({
      where: { categoriaId: categoriaRow.id, [campo]: { equals: data[campo], mode: "insensitive" }, ...(excluirId ? { NOT: { id: excluirId } } : {}) },
    });
    if (otro) {
      const nombreTipo = nombreCategoria(categoriaRow);
      throw new ApiError(409, campo === "codigo" ? "CODIGO_DUPLICADO" : "SERIAL_DUPLICADO",
        `Ya hay un equipo de tipo ${nombreTipo} con el ${campo === "codigo" ? "código" : "serial"} ${data[campo]}.`);
    }
  }
}

function diasAnticipacionValidos(dias) {
  if (dias === undefined || dias === null || dias === "") return undefined;
  const n = Number(dias);
  if (!Number.isInteger(n) || n < 1 || n > 365) throw validacionFallida("Los días de anticipación deben estar entre 1 y 365.");
  return n;
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
      ...(categoria ? { categoria: tipoPorNombre(categoria) ? { tipo: tipoPorNombre(categoria) } : { nombre: categoria } } : {}),
      ...(estado ? { estado: estado.toUpperCase() } : {}),
      ...(q
        ? {
            OR: [
              { codigo: { contains: q, mode: "insensitive" } },
              { serial: { contains: q, mode: "insensitive" } },
              { marca: { contains: q, mode: "insensitive" } },
              { lote: { contains: q, mode: "insensitive" } },
              { categoria: { nombre: { contains: q, mode: "insensitive" } } },
              // También por el nombre de la tabla ("Secuencímetro", con tilde).
              { categoria: { tipo: { in: ORDEN_TIPOS.filter((t) => TIPOS_EQUIPO[t].nombre.toLocaleLowerCase("es").includes(q.toLocaleLowerCase("es"))) } } },
            ],
          }
        : {}),
    },
    include: INCLUDE,
    orderBy: { creadoEn: "desc" },
  });
  return equipos.map(serializar);
}

export async function crearEquipo(body, empresasPermitidas, usuarioId) {
  const { categoria, empresa, fotos } = body;
  verificarAccesoEmpresa(empresa, empresasPermitidas);

  const categoriaRow = await buscarCategoria(categoria);
  if (!categoriaRow) throw validacionFallida("El tipo de equipo indicado no existe.");
  // Solo los 9 tipos con reglas: las categorías antiguas sin tipo se
  // conservan para sus equipos, pero no se usan para registrar nuevos.
  if (!camposDelTipo(categoriaRow.tipo)) throw validacionFallida("Elige uno de los tipos de equipo de la lista.");

  const empresaRow = await db.empresa.findUnique({ where: { slug: empresa } });
  if (!empresaRow) throw validacionFallida("Empresa inválida.");

  const data = datosSegunTipo(categoriaRow, body);
  await verificarUnicos(categoriaRow, data);
  const dias = diasAnticipacionValidos(body.diasAnticipacion);

  // El registro del equipo y su primera línea de historial son un solo
  // hecho de negocio ("se dio de alta") — si el historial fallara por
  // cualquier motivo, no queremos un equipo fantasma sin rastro alguno.
  const nuevo = await db.$transaction(async (tx) => {
    const creado = await tx.equipo.create({
      data: {
        ...data,
        categoriaId: categoriaRow.id,
        empresaId: empresaRow.id,
        camposValores: {},
        fotos: (fotos || []).filter(Boolean),
        ...(dias !== undefined ? { diasAnticipacionInspeccion: dias } : {}),
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

// Edita los datos base del equipo según su tipo. Un equipo registrado
// antes de esta versión al que le falte un dato obligatorio de su tipo
// no se puede guardar hasta completarlo (el formulario lo pide).
// Categoría antigua sin tipo: se conservan sus campos libres y su código.
export async function actualizarEquipo(equipoId, body, empresasPermitidas, usuarioId) {
  const equipo = await buscarEquipo(equipoId, empresasPermitidas);

  const categoriaRow = await buscarCategoria(body.categoria);
  if (!categoriaRow) throw validacionFallida("El tipo de equipo indicado no existe.");
  const esLaMisma = categoriaRow.id === equipo.categoriaId;
  if (!camposDelTipo(categoriaRow.tipo) && !esLaMisma) throw validacionFallida("Elige uno de los tipos de equipo de la lista.");

  let data;
  if (camposDelTipo(categoriaRow.tipo)) {
    data = datosSegunTipo(categoriaRow, body);
  } else {
    // Categoría antigua: como antes (código obligatorio + campos libres).
    const codigo = typeof body.codigo === "string" ? body.codigo.trim().toUpperCase() : "";
    if (!codigo) throw validacionFallida("Completa el campo obligatorio: Código.");
    data = { codigo, camposValores: body.camposValores || equipo.camposValores };
  }
  await verificarUnicos(categoriaRow, data, equipoId);
  const dias = diasAnticipacionValidos(body.diasAnticipacion);

  const actualizado = await db.$transaction(async (tx) => {
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: { ...data, categoriaId: categoriaRow.id, ...(dias !== undefined ? { diasAnticipacionInspeccion: dias } : {}) },
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
    throw conflicto(
      `No se puede eliminar el equipo ${identificadorEquipo(equipo)}: ya tiene ${eventosDeHistorial - 1} ${eventosDeHistorial - 1 === 1 ? "evento" : "eventos"} en su hoja de vida (asignaciones, inspecciones, mantenimientos). Usa "Dar de baja" para retirarlo sin perder ese historial.`,
      "EQUIPO_CON_HISTORIAL"
    );
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
export async function registrarInspeccion(equipoId, { tipo, fechaInspeccion, fechaVencimiento, diasAnticipacion, resultado }, empresasPermitidas, usuarioId) {
  await buscarEquipo(equipoId, empresasPermitidas);
  if (fechaVencimiento.slice(0, 10) < fechaInspeccion.slice(0, 10)) {
    throw validacionFallida("La fecha de vencimiento no puede ser anterior a la fecha de inspección.");
  }
  const aprobado = resultado === "aprobado";
  const etiquetaResultado = { aprobado: "Aprobado", observado: "Observado", rechazado: "Rechazado" }[resultado];

  const actualizado = await db.$transaction(async (tx) => {
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: {
        estado: aprobado ? "DISPONIBLE" : "MANTENIMIENTO",
        ultimaInspeccion: new Date(fechaInspeccion),
        proximaInspeccion: new Date(fechaVencimiento),
        // Antes este valor del modal se descartaba y se avisaba siempre
        // con 15 días fijos.
        ...(diasAnticipacion !== undefined ? { diasAnticipacionInspeccion: diasAnticipacion } : {}),
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

// Por id: los equipos sin código (arnés, línea de vida...) también tienen hoja de vida.
export async function obtenerHojaDeVida(equipoId, empresasPermitidas) {
  const equipo = await db.equipo.findUnique({
    where: { id: equipoId },
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
