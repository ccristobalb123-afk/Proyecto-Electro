import { db } from "../lib/db.js";
import { formatearFecha, formatearFechaDia } from "../lib/estadoVencimiento.js";
import { ApiError, validacionFallida, conflicto } from "../lib/errors.js";
import { empresasParaFiltro, verificarAccesoEmpresa } from "../lib/autorizacionEmpresa.js";
import { camposDelTipo, ETIQUETAS_CAMPO, nombreCategoria, tipoPorNombre, ORDEN_TIPOS, TIPOS_EQUIPO } from "../lib/tiposEquipo.js";
import { ENUM_A_TIPO } from "./vehiculos.service.js";

const INCLUDE = { categoria: true, empresa: true, vehiculo: true, personal: true };

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

// "16 oct 2026, 12:05" en hora de Perú (las asignaciones pueden cambiar
// varias veces en el mismo día).
function fechaHoraPeru(fecha) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(fecha))
      .map((x) => [x.type, x.value])
  );
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${p.day} ${MESES[Number(p.month) - 1]} ${p.year}, ${p.hour}:${p.minute}`;
}

/** "Camión ARE-793", el nombre de la persona, o null si no está asignado. */
function textoDestinatario(equipo) {
  if (equipo.vehiculo) return `Camión ${equipo.vehiculo.placa}`;
  if (equipo.personal) return equipo.personal.nombre;
  return null;
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
    // A quién está asignado: un camión o una persona (nunca los dos).
    responsable: textoDestinatario(equipo),
    asignadoA: equipo.vehiculo
      ? { tipo: "camion", id: equipo.vehiculo.id, nombre: equipo.vehiculo.placa }
      : equipo.personal
        ? { tipo: "persona", id: equipo.personal.id, nombre: equipo.personal.nombre, dni: equipo.personal.dni }
        : null,
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
              // Por a quién está asignado: placa del camión, o nombre o DNI de la persona.
              { vehiculo: { placa: { contains: q, mode: "insensitive" } } },
              { personal: { nombre: { contains: q, mode: "insensitive" } } },
              { personal: { dni: { contains: q } } },
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

// ---- Asignación ----
// Reglas (también hay dos CHECK en la base): un equipo ASIGNADO tiene
// siempre UN destinatario (un camión o una persona, de cualquier
// empresa) y en cualquier otro estado no tiene ninguno. Toda salida de
// ASIGNADO cierra la asignación en el historial (asignaciones_equipo).

// Dentro de una transacción: bloquea la fila del equipo hasta el final
// (dos cambios a la vez sobre el mismo equipo se hacen uno detrás del
// otro, así nunca quedan dos asignaciones abiertas) y lo relee.
async function bloquearEquipo(tx, equipoId) {
  await tx.$queryRaw`SELECT id FROM equipos WHERE id = ${equipoId} FOR UPDATE`;
  return tx.equipo.findUnique({ where: { id: equipoId }, include: INCLUDE });
}

// Cierra la asignación abierta (si hay) con su motivo. Devuelve a quién
// estaba asignado ("Camión ARE-793", "Ana Torres") o null. Quien llama
// deja vehiculoId y personalId en null al actualizar el equipo.
async function cerrarAsignacion(tx, equipo, motivo) {
  await tx.asignacionEquipo.updateMany({ where: { equipoId: equipo.id, hasta: null }, data: { hasta: new Date(), motivoFin: motivo } });
  return textoDestinatario(equipo);
}

const SIN_DESTINATARIO = { vehiculoId: null, personalId: null };
const seLibero = (tenia) => (tenia ? ` — se liberó de ${tenia}` : "");

// Disponible y Vencido. Asignar, mantenimiento y baja tienen su propio
// flujo porque piden datos que acá no llegan.
export async function cambiarEstadoEquipo(equipoId, estado, empresasPermitidas, usuarioId) {
  if (estado === "asignado") {
    throw validacionFallida("Para asignar un equipo hay que elegir un camión o una persona.");
  }
  if (estado === "mantenimiento") {
    throw validacionFallida("Para enviar a mantenimiento hay que indicar qué tiene el equipo.");
  }
  if (estado === "debaja") {
    throw validacionFallida("Para dar de baja un equipo hay que indicar el motivo.");
  }

  await buscarEquipo(equipoId, empresasPermitidas);
  const actualizado = await db.$transaction(async (tx) => {
    const equipo = await bloquearEquipo(tx, equipoId);
    const nuevo = estado.toUpperCase();
    const asignado = equipo.vehiculoId || equipo.personalId;
    if (equipo.estado === nuevo && !asignado) return equipo;

    const tenia = await cerrarAsignacion(tx, equipo, nuevo === "DISPONIBLE" ? "Devuelto" : "Marcado como vencido");
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: { estado: nuevo, ...SIN_DESTINATARIO },
      include: INCLUDE,
    });
    const titulo =
      nuevo === "DISPONIBLE"
        ? tenia ? `Devuelto — lo tenía ${tenia}` : "Estado cambiado a Disponible"
        : `Marcado como vencido${seLibero(tenia)}`;
    await tx.historialEquipo.create({ data: { equipoId, titulo, tono: nuevo === "VENCIDO" ? "danger" : null, usuarioId } });
    return act;
  });
  return serializar(actualizado);
}

/**
 * Asigna el equipo a UN destinatario: { vehiculoId } o { personalId }.
 * Si ya estaba asignado a otro, es una reasignación: se cierra la
 * anterior y se abre la nueva en la misma transacción.
 */
export async function asignarEquipo(equipoId, { vehiculoId, personalId }, empresasPermitidas, usuarioId) {
  if (!vehiculoId === !personalId) throw validacionFallida("Elige un camión o una persona (solo uno).");
  await buscarEquipo(equipoId, empresasPermitidas);

  // Cualquier empresa: el camión o la persona no tienen que ser de la
  // empresa del equipo.
  let destino;
  if (vehiculoId) {
    const vehiculo = await db.vehiculo.findUnique({ where: { id: vehiculoId } });
    if (!vehiculo) throw new ApiError(404, "NO_ENCONTRADO", "El camión indicado no existe.");
    destino = { tipo: "CAMION", vehiculoId: vehiculo.id, personalId: null, nombre: vehiculo.placa, texto: `Camión ${vehiculo.placa}` };
  } else {
    const persona = await db.personal.findUnique({ where: { id: personalId } });
    if (!persona) throw new ApiError(404, "NO_ENCONTRADO", "La persona indicada no existe.");
    destino = { tipo: "PERSONA", vehiculoId: null, personalId: persona.id, nombre: persona.nombre, texto: persona.nombre };
  }

  const actualizado = await db.$transaction(async (tx) => {
    const equipo = await bloquearEquipo(tx, equipoId);
    if (equipo.estado === "VENCIDO" || equipo.estado === "DEBAJA") {
      throw validacionFallida("Un equipo vencido o de baja no se puede asignar.");
    }
    const mismo = destino.vehiculoId ? equipo.vehiculoId === destino.vehiculoId : equipo.personalId === destino.personalId;
    if (mismo) throw conflicto(`El equipo ya está asignado a ${destino.texto}.`, "YA_ASIGNADO");

    const tenia = await cerrarAsignacion(tx, equipo, "Reasignado");
    await tx.asignacionEquipo.create({
      data: { equipoId, tipo: destino.tipo, vehiculoId: destino.vehiculoId, personalId: destino.personalId, destinatario: destino.nombre },
    });
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: { estado: "ASIGNADO", vehiculoId: destino.vehiculoId, personalId: destino.personalId },
      include: INCLUDE,
    });
    await tx.historialEquipo.create({
      data: { equipoId, titulo: tenia ? `Reasignado de ${tenia} a ${destino.texto}` : `Asignado a ${destino.texto}`, tono: "success", usuarioId },
    });
    return act;
  });

  return serializar(actualizado);
}

/**
 * Para el modal "Asignar equipo": TODOS los camiones y TODO el personal,
 * de todas las empresas (la empresa va solo como dato). Datos mínimos:
 * placa y tipo; nombre, DNI y empresas según sus contratos.
 */
export async function listarDestinatarios() {
  const [vehiculos, personal] = await Promise.all([
    db.vehiculo.findMany({ include: { empresaDuena: true, empresaUso: true }, orderBy: { placa: "asc" } }),
    db.personal.findMany({ include: { contratos: { include: { empresa: true } } }, orderBy: { nombre: "asc" } }),
  ]);
  return {
    camiones: vehiculos.map((v) => ({
      id: v.id,
      placa: v.placa,
      tipoUnidad: ENUM_A_TIPO[v.tipoUnidad],
      cuadrilla: v.cuadrilla,
      empresa: v.empresaDuena.nombre,
      ...(v.empresaUsoId !== v.empresaDuenaId ? { empresaUso: v.empresaUso.nombre } : {}),
    })),
    personas: personal.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      dni: p.dni,
      empresas: [...new Set(p.contratos.map((c) => c.empresa.nombre))],
    })),
  };
}

/** Historial de asignaciones del equipo, la más reciente primero. */
export async function listarAsignaciones(equipoId, empresasPermitidas) {
  await buscarEquipo(equipoId, empresasPermitidas);
  const filas = await db.asignacionEquipo.findMany({ where: { equipoId }, orderBy: [{ desde: "desc" }, { id: "desc" }], include: { personal: true } });
  return filas.map((a) => ({
    id: a.id,
    tipo: a.tipo === "CAMION" ? "camion" : "persona",
    destinatario: a.destinatario,
    ...(a.personal ? { dni: a.personal.dni } : {}),
    desde: fechaHoraPeru(a.desde),
    hasta: a.hasta ? fechaHoraPeru(a.hasta) : null,
    motivoFin: a.motivoFin,
  }));
}

export async function enviarAMantenimiento(equipoId, comentario, empresasPermitidas, usuarioId) {
  await buscarEquipo(equipoId, empresasPermitidas);

  const actualizado = await db.$transaction(async (tx) => {
    const equipo = await bloquearEquipo(tx, equipoId);
    const tenia = await cerrarAsignacion(tx, equipo, "Enviado a mantenimiento");
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: { estado: "MANTENIMIENTO", ...SIN_DESTINATARIO, comentarioMantenimiento: comentario },
      include: INCLUDE,
    });
    await tx.historialEquipo.create({ data: { equipoId, titulo: `Enviado a mantenimiento${seLibero(tenia)}`, tono: "volt", usuarioId } });
    return act;
  });

  return serializar(actualizado);
}

export async function darDeBajaEquipo(equipoId, motivo, empresasPermitidas, usuarioId) {
  await buscarEquipo(equipoId, empresasPermitidas);

  const actualizado = await db.$transaction(async (tx) => {
    const equipo = await bloquearEquipo(tx, equipoId);
    const tenia = await cerrarAsignacion(tx, equipo, "Dado de baja");
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: { estado: "DEBAJA", motivoBaja: motivo, ...SIN_DESTINATARIO },
      include: INCLUDE,
    });
    await tx.historialEquipo.create({ data: { equipoId, titulo: `Dado de baja — ${motivo}${seLibero(tenia)}`, usuarioId } });
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
    const equipo = await bloquearEquipo(tx, equipoId);
    // Aprobado: si estaba asignado, sigue asignado al mismo destinatario.
    // Observado o rechazado: pasa a mantenimiento y se libera.
    const sigueAsignado = aprobado && equipo.estado === "ASIGNADO";
    const tenia = aprobado ? null : await cerrarAsignacion(tx, equipo, `Inspección ${etiquetaResultado.toLowerCase()}`);
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: {
        estado: sigueAsignado ? "ASIGNADO" : aprobado ? "DISPONIBLE" : "MANTENIMIENTO",
        ...(sigueAsignado ? {} : SIN_DESTINATARIO),
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
        titulo: `Inspección ${tipo === "interna" ? "interna" : "externa"} — ${etiquetaResultado}${seLibero(tenia)}`,
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
