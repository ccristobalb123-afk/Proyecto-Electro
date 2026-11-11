import { db } from "../lib/db.js";
import { formatearFecha, formatearFechaDia, vencidoPorFecha } from "../lib/estadoVencimiento.js";
import { ApiError, validacionFallida, conflicto } from "../lib/errors.js";
import { empresasParaFiltro, verificarAccesoEmpresa } from "../lib/autorizacionEmpresa.js";
import { camposDelTipo, ETIQUETAS_CAMPO, admiteRegistro, campoIdentificador, destinoApi, normalizarTexto } from "../lib/tiposEquipo.js";
import { ENUM_A_TIPO } from "./vehiculos.service.js";
import { fotosDeRegistro, resolverFotos, guardarFotos, textoFotosCambiadas, decodificarFoto, versionFoto } from "../lib/fotosEquipo.js";

const INCLUDE = { categoria: true, empresa: true, vehiculo: true, personal: true };

// Enlaces a las fotos actuales del equipo, no las fotos: el navegador las
// pide con <img> (la cookie de sesión viaja sola) solo cuando se ven, y
// las guarda en caché. ?v= cambia si cambia la foto (ver
// obtenerFotoActual). Antes el listado llevaba las fotos en base64 (unos
// 350 KB cada una) y pesaba ~23 MB con 66 fotos.
function urlsFotosActuales(equipo) {
  return (Array.isArray(equipo.fotos) ? equipo.fotos : [])
    .map((f, i) => (f ? `/api/equipos/${equipo.id}/foto-actual/${i + 1}?v=${versionFoto(f)}` : null))
    .filter(Boolean);
}

// "2026-10-16" de una columna DATE (medianoche UTC) — sin desfase de día.
const isoDia = (fecha) => (fecha ? new Date(fecha).toISOString().slice(0, 10) : null);

/** Hoy en Perú como "AAAA-MM-DD", sin depender de la zona del servidor. */
export function hoyEnPeru() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
}

// Valor de un campo tal como está guardado (las fechas de inspección viven
// en ultima_inspeccion / proxima_inspeccion, las mismas que actualiza
// "Actualizar inspección" y de las que salen los avisos).
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

// ---- Vencido ----
// Vencido NO se elige a mano: depende solo de la fecha de vencimiento.
// Un equipo está vencido si esa fecha ya pasó (la misma regla que los
// avisos); se calcula al leer y deja de estarlo solo al renovar sus
// fechas. De baja no cuenta (ya no se usa). Mientras esté vencido no se puede
// asignar, reasignar ni dejar Disponible sin renovar sus fechas.
// Si vence estando asignado, sigue asignado (físicamente lo tiene esa
// persona o camión) pero se muestra Vencido y bloqueado hasta que se
// devuelva o se renueven sus fechas.
export const MENSAJE_VENCIDO = "Este equipo está vencido. Actualiza sus fechas para volver a usarlo.";
export const MENSAJE_VENCIDO_MANUAL = "El estado Vencido se asigna automáticamente según la fecha de vencimiento.";

export function estaVencido(equipo) {
  return equipo.estado !== "DEBAJA" && vencidoPorFecha(equipo.proximaInspeccion);
}

/**
 * Estado que se muestra y con el que se filtra: Vencido (por fecha) gana
 * a Disponible, Asignado y Mantenimiento. El valor VENCIDO guardado (de
 * cuando se podía marcar a mano; ya no se escribe) no cuenta: sin la
 * fecha pasada se ve Disponible.
 */
export function estadoEfectivo(equipo) {
  if (estaVencido(equipo)) return "VENCIDO";
  return equipo.estado === "VENCIDO" ? "DISPONIBLE" : equipo.estado;
}

const errorVencido = () => conflicto(MENSAJE_VENCIDO, "EQUIPO_VENCIDO");

/** Lo que se muestra para identificar al equipo: su Código o, si no tiene, su Serial. */
export function identificadorEquipo(equipo) {
  return equipo.codigo || equipo.serial || `Equipo #${equipo.id}`;
}

function serializar(equipo) {
  const campos = camposDelTipo(equipo.categoria);
  return {
    id: equipo.id,
    identificador: identificadorEquipo(equipo),
    codigo: equipo.codigo,
    categoria: equipo.categoria.nombre,
    tipo: equipo.categoria.tipo,
    // A quién se asigna su tipo: "camion" | "persona".
    destinoTipo: destinoApi(equipo.categoria),
    empresa: equipo.empresa.slug,
    // A quién está asignado: un camión o una persona (nunca los dos).
    responsable: textoDestinatario(equipo),
    asignadoA: equipo.vehiculo
      ? { tipo: "camion", id: equipo.vehiculo.id, nombre: equipo.vehiculo.placa }
      : equipo.personal
        ? { tipo: "persona", id: equipo.personal.id, nombre: equipo.personal.nombre, dni: equipo.personal.dni }
        : null,
    estado: estadoEfectivo(equipo).toLowerCase(),
    // Vencido por fecha (puede seguir asignado).
    ...(estaVencido(equipo) ? { vencidoPorFecha: true } : {}),
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
    fotos: urlsFotosActuales(equipo),
    ...(equipo.comentarioMantenimiento ? { comentarioMantenimiento: equipo.comentarioMantenimiento } : {}),
    ...(equipo.ultimaInspeccion ? { ultInspeccion: formatearFechaDia(equipo.ultimaInspeccion) } : {}),
    ...(equipo.proximaInspeccion ? { proxInspeccion: formatearFechaDia(equipo.proximaInspeccion) } : {}),
    ultInspeccionIso: isoDia(equipo.ultimaInspeccion),
    proxInspeccionIso: isoDia(equipo.proximaInspeccion),
    diasAnticipacionInspeccion: equipo.diasAnticipacionInspeccion,
  };
}

/** Tipo de equipo por su nombre (sin distinguir mayúsculas: es único así). */
function buscarCategoria(nombre) {
  return db.categoriaEquipo.findFirst({ where: { nombre: { equals: String(nombre || "").trim(), mode: "insensitive" } } });
}

// ---- Datos según el tipo ----
const fechaValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;

/**
 * Arma los datos a guardar según el tipo de la categoría: exige los
 * campos que el tipo pide y deja en NULL los que no le corresponden
 * (aunque lleguen en el pedido). Lanza 400 con un mensaje claro.
 */
function datosSegunTipo(categoriaRow, body) {
  const campos = camposDelTipo(categoriaRow);
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

const errorTipoNoAdmite = (categoria) =>
  validacionFallida(
    categoria.activo
      ? "Elige uno de los tipos de equipo de la lista."
      : `El tipo ${categoria.nombre} está desactivado: no se registran equipos nuevos de este tipo.`
  );

// Código y Serial no se repiten dentro del mismo tipo (se guardan en
// mayúsculas, así "abc-1" y "ABC-1" chocan igual).
async function verificarUnicos(categoriaRow, data, excluirId = null) {
  for (const campo of ["codigo", "serial"]) {
    if (!data[campo]) continue;
    const otro = await db.equipo.findFirst({
      where: { categoriaId: categoriaRow.id, [campo]: { equals: data[campo], mode: "insensitive" }, ...(excluirId ? { NOT: { id: excluirId } } : {}) },
    });
    if (otro) {
      const nombreTipo = categoriaRow.nombre;
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
  // Tipos cuyo nombre contiene lo buscado, sin distinguir mayúsculas ni
  // tildes ("secuencimetro" encuentra "Secuencímetro").
  const tiposBuscados = q
    ? (await db.categoriaEquipo.findMany({ select: { id: true, nombre: true } })).filter((c) => normalizarTexto(c.nombre).includes(normalizarTexto(q))).map((c) => c.id)
    : [];
  const equipos = await db.equipo.findMany({
    where: {
      empresa: { slug: { in: empresasFiltro } },
      ...(categoria ? { categoria: { nombre: { equals: categoria, mode: "insensitive" } } } : {}),
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
              { categoriaId: { in: tiposBuscados } },
            ],
          }
        : {}),
    },
    include: INCLUDE,
    orderBy: { creadoEn: "desc" },
  });
  // El estado se filtra con el efectivo (un Disponible con la fecha
  // pasada aparece en "Vencido", no en "Disponible").
  return equipos.filter((e) => !estado || estadoEfectivo(e) === estado.toUpperCase()).map(serializar);
}

export async function crearEquipo(body, empresasPermitidas, usuarioId) {
  const { categoria, empresa, fotos } = body;
  verificarAccesoEmpresa(empresa, empresasPermitidas);

  const categoriaRow = await buscarCategoria(categoria);
  if (!categoriaRow) throw validacionFallida("El tipo de equipo indicado no existe.");
  // Los tipos desactivados y las categorías heredadas sin reglas se
  // conservan para sus equipos, pero no se usan para registrar nuevos.
  if (!admiteRegistro(categoriaRow)) throw errorTipoNoAdmite(categoriaRow);

  const empresaRow = await db.empresa.findUnique({ where: { slug: empresa } });
  if (!empresaRow) throw validacionFallida("Empresa inválida.");

  const data = datosSegunTipo(categoriaRow, body);
  // Siempre 2 fotos (antes se aceptaba registrar sin fotos).
  const fotosNuevas = fotosDeRegistro(fotos);
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
        fotos: fotosNuevas,
        ...(dias !== undefined ? { diasAnticipacionInspeccion: dias } : {}),
      },
      include: INCLUDE,
    });
    const idsFotos = await guardarFotos(tx, creado.id, fotosNuevas);
    await tx.historialEquipo.create({ data: { equipoId: creado.id, titulo: "Registrado en el sistema", usuarioId, datos: { fotos: idsFotos } } });
    return creado;
  });

  return serializar(nuevo);
}

/**
 * "Editar fotos": cada una de las 2 se mantiene ("actual") o se cambia, y
 * el equipo queda siempre con exactamente 2. Las reemplazadas no se
 * borran: quedan en el historial como "Fotos actualizadas", que no es una
 * inspección (no cambia fechas, resultado ni estado).
 */
export async function actualizarFotosEquipo(equipoId, fotosEntrada, empresasPermitidas, usuarioId) {
  await buscarEquipo(equipoId, empresasPermitidas);
  const actualizado = await db.$transaction(async (tx) => {
    const equipo = await bloquearEquipo(tx, equipoId);
    const { fotos, reemplazadas, cambiadas } = resolverFotos(fotosEntrada, equipo.fotos);
    if (!cambiadas.length) return equipo;
    const idsFotos = await guardarFotos(tx, equipoId, fotos);
    const idsReemplazadas = await guardarFotos(tx, equipoId, reemplazadas);
    const act = await tx.equipo.update({ where: { id: equipoId }, data: { fotos }, include: INCLUDE });
    await tx.historialEquipo.create({
      data: { equipoId, titulo: `Fotos actualizadas — ${textoFotosCambiadas(cambiadas)}`, usuarioId, datos: { fotos: idsFotos, reemplazadas: idsReemplazadas } },
    });
    return act;
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
  // Se puede seguir editando un equipo de un tipo desactivado o heredado,
  // pero no pasarlo a uno de esos.
  if (!esLaMisma && !admiteRegistro(categoriaRow)) throw errorTipoNoAdmite(categoriaRow);

  let data;
  if (camposDelTipo(categoriaRow)) {
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
    // Cambiar de tipo un equipo asignado: el destinatario actual tiene que
    // cumplir las reglas del tipo nuevo (destino y cantidad).
    if (!esLaMisma) {
      const enUso = await bloquearEquipo(tx, equipoId);
      const destino = destinoDeEquipo(enUso);
      if (destino) await verificarReglasDestino(tx, enUso, categoriaRow.id, destino, empresasPermitidas);
    }
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: { ...data, categoriaId: categoriaRow.id, ...(dias !== undefined ? { diasAnticipacionInspeccion: dias } : {}) },
      include: INCLUDE,
    });
    const fechasCambiaron =
      "proximaInspeccion" in data && (isoDia(data.proximaInspeccion) !== isoDia(equipo.proximaInspeccion) || isoDia(data.ultimaInspeccion) !== isoDia(equipo.ultimaInspeccion));
    const titulo = fechasCambiaron
      ? `Datos actualizados — inspección ${formatearFechaDia(data.ultimaInspeccion)}, vence ${formatearFechaDia(data.proximaInspeccion)}`
      : "Datos actualizados";
    await tx.historialEquipo.create({ data: { equipoId, titulo, usuarioId } });
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

// Solo Disponible (Vencido no se elige a mano). Asignar, mantenimiento
// y baja tienen su propio flujo porque piden datos que acá no llegan. Un
// equipo vencido NO pasa a Disponible por acá: hay que renovar sus fechas
// con "Actualizar inspección" (que también pide las 2 fotos).
export async function cambiarEstadoEquipo(equipoId, estado, empresasPermitidas, usuarioId, fechas = {}) {
  if (estado === "vencido") throw validacionFallida(MENSAJE_VENCIDO_MANUAL);
  if (estado === "asignado") {
    throw validacionFallida("Para asignar un equipo hay que elegir un camión o una persona.");
  }
  if (estado === "mantenimiento") {
    throw validacionFallida("Para enviar a mantenimiento hay que indicar qué tiene el equipo.");
  }
  if (estado === "debaja") {
    throw validacionFallida("Para dar de baja un equipo hay que indicar el motivo.");
  }
  if (estado !== "disponible") throw validacionFallida("Estado inválido.");
  if (fechas.fechaInspeccion || fechas.fechaVencimiento) {
    throw validacionFallida("Para renovar las fechas usa \"Actualizar inspección\" en la tarjeta del equipo.");
  }

  await buscarEquipo(equipoId, empresasPermitidas);
  const actualizado = await db.$transaction(async (tx) => {
    const equipo = await bloquearEquipo(tx, equipoId);
    // También si viene de Baja o Mantenimiento con la fecha pasada: quedaría vencido.
    if (vencidoPorFecha(equipo.proximaInspeccion)) throw errorVencido();
    const asignado = equipo.vehiculoId || equipo.personalId;
    if (equipo.estado === "DISPONIBLE" && !asignado) return equipo;

    const tenia = await cerrarAsignacion(tx, equipo, "Devuelto");
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: { estado: "DISPONIBLE", ...SIN_DESTINATARIO },
      include: INCLUDE,
    });
    await tx.historialEquipo.create({ data: { equipoId, titulo: tenia ? `Devuelto — lo tenía ${tenia}` : "Estado cambiado a Disponible", usuarioId } });
    return act;
  });
  return serializar(actualizado);
}

/**
 * Devolver: el equipo deja de estar asignado y se guarda Disponible; si
 * su fecha ya pasó se sigue viendo Vencido (hay que renovar sus fechas
 * para volver a usarlo).
 */
export async function devolverEquipo(equipoId, empresasPermitidas, usuarioId) {
  await buscarEquipo(equipoId, empresasPermitidas);
  const actualizado = await db.$transaction(async (tx) => {
    const equipo = await bloquearEquipo(tx, equipoId);
    if (!equipo.vehiculoId && !equipo.personalId) throw conflicto("El equipo no está asignado a nadie.", "NO_ASIGNADO");
    const vencido = estaVencido(equipo);
    const tenia = await cerrarAsignacion(tx, equipo, "Devuelto");
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: { estado: "DISPONIBLE", ...SIN_DESTINATARIO },
      include: INCLUDE,
    });
    await tx.historialEquipo.create({
      data: { equipoId, titulo: `Devuelto — lo tenía ${tenia}${vencido ? " (queda Vencido: hay que renovar sus fechas)" : ""}`, tono: vencido ? "danger" : null, usuarioId },
    });
    return act;
  });
  return serializar(actualizado);
}

// ---- Reglas de destino por tipo ----
// Cada tipo se asigna SOLO a camiones o SOLO a personas y, salvo que
// permita varias unidades (Escalera Embonable), cada persona o camión
// tiene a lo sumo un equipo de ese tipo (ver categoriasEquipo.service.js).

const textoDestinoTipo = (destino) => (destino === "CAMION" ? "camiones" : "personas");

// Destinatario actual del equipo, o null si no está asignado.
function destinoDeEquipo(equipo) {
  if (equipo.vehiculoId) return { tipo: "CAMION", vehiculoId: equipo.vehiculoId, personalId: null, sujeto: `El camión ${equipo.vehiculo.placa}` };
  if (equipo.personalId) return { tipo: "PERSONA", vehiculoId: null, personalId: equipo.personalId, sujeto: equipo.personal.nombre };
  return null;
}

// "un equipo de tipo Arnés (serial ARN-001)". Si el que ya tiene es de
// una empresa que este usuario no ve, no se muestra su código.
function equipoQueYaTiene(categoria, otro, empresasPermitidas) {
  const visible = !empresasPermitidas || empresasPermitidas.includes(otro.empresa.slug);
  const campo = campoIdentificador(categoria) === "codigo" && otro.codigo ? "código" : "serial";
  return `un equipo de tipo ${categoria.nombre}${visible ? ` (${campo} ${identificadorEquipo(otro)})` : " de otra empresa"}`;
}

const mensajeYaTiene = (destino, categoria, otro, empresasPermitidas) =>
  `${destino.sujeto} ya tiene asignado ${equipoQueYaTiene(categoria, otro, empresasPermitidas)}. Devuélvelo o reasígnalo antes de asignar otro.`;

/**
 * Dentro de una transacción, con el equipo ya bloqueado: el tipo
 * `categoriaId` admite a `destino`. Bloqueos (siempre en este orden:
 * equipo → tipo → destinatario), para que doble clic o dos pedidos a la
 * vez nunca dejen dos del mismo tipo en la misma persona o camión:
 *   - el tipo con FOR SHARE: un cambio de sus reglas a la vez espera;
 *   - el destinatario con FOR UPDATE: dos asignaciones a la misma persona
 *     o camión se hacen una detrás de la otra, y la segunda ve la primera.
 */
async function verificarReglasDestino(tx, equipo, categoriaId, destino, empresasPermitidas) {
  await tx.$queryRaw`SELECT id FROM categorias_equipo WHERE id = ${categoriaId} FOR SHARE`;
  const categoria = await tx.categoriaEquipo.findUnique({ where: { id: categoriaId } });
  if (categoria.destino !== destino.tipo) {
    throw new ApiError(400, "DESTINO_INCORRECTO", `Los equipos de tipo ${categoria.nombre} solo se asignan a ${textoDestinoTipo(categoria.destino)}.`);
  }
  if (categoria.variasPorDestinatario) return;
  if (destino.vehiculoId) await tx.$queryRaw`SELECT id FROM vehiculos WHERE id = ${destino.vehiculoId} FOR UPDATE`;
  else await tx.$queryRaw`SELECT id FROM personal WHERE id = ${destino.personalId} FOR UPDATE`;
  const otro = await tx.equipo.findFirst({
    where: { categoriaId, id: { not: equipo.id }, ...(destino.vehiculoId ? { vehiculoId: destino.vehiculoId } : { personalId: destino.personalId }) },
    include: { empresa: true },
  });
  if (otro) throw conflicto(mensajeYaTiene(destino, categoria, otro, empresasPermitidas), "YA_TIENE_TIPO");
}

/**
 * Asigna el equipo a UN destinatario: { vehiculoId } o { personalId },
 * del tipo que admite su tipo de equipo. Si ya estaba asignado a otro, es
 * una reasignación: se cierra la anterior y se abre la nueva en la misma
 * transacción. El equipo que se reasigna no cuenta como duplicado.
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
    destino = { tipo: "CAMION", vehiculoId: vehiculo.id, personalId: null, nombre: vehiculo.placa, texto: `Camión ${vehiculo.placa}`, sujeto: `El camión ${vehiculo.placa}` };
  } else {
    const persona = await db.personal.findUnique({ where: { id: personalId } });
    if (!persona) throw new ApiError(404, "NO_ENCONTRADO", "La persona indicada no existe.");
    destino = { tipo: "PERSONA", vehiculoId: null, personalId: persona.id, nombre: persona.nombre, texto: persona.nombre, sujeto: persona.nombre };
  }

  const actualizado = await db.$transaction(async (tx) => {
    const equipo = await bloquearEquipo(tx, equipoId);
    if (equipo.estado === "DEBAJA") throw validacionFallida("Un equipo de baja no se puede asignar.");
    if (estaVencido(equipo)) throw errorVencido();
    const mismo = destino.vehiculoId ? equipo.vehiculoId === destino.vehiculoId : equipo.personalId === destino.personalId;
    if (mismo) throw conflicto(`El equipo ya está asignado a ${destino.texto}.`, "YA_ASIGNADO");
    await verificarReglasDestino(tx, equipo, equipo.categoriaId, destino, empresasPermitidas);

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
 * Para el modal "Asignar equipo": solo los destinatarios que admite el
 * tipo del equipo (todos los camiones o todo el personal, de todas las
 * empresas; la empresa va solo como dato). Los que ya tienen un equipo de
 * ese tipo (si el tipo no permite varias unidades) llegan con `bloqueo`:
 * el motivo por el que no se pueden elegir. Quien ya tiene ESTE equipo
 * llega con `actual: true`.
 */
export async function listarDestinatarios(equipoId, empresasPermitidas) {
  const equipo = await buscarEquipo(equipoId, empresasPermitidas);
  const categoria = equipo.categoria;
  const aCamion = categoria.destino === "CAMION";
  const ocupados = categoria.variasPorDestinatario
    ? []
    : await db.equipo.findMany({
        where: { categoriaId: categoria.id, id: { not: equipo.id }, ...(aCamion ? { vehiculoId: { not: null } } : { personalId: { not: null } }) },
        include: { empresa: true },
      });
  const ocupadoPor = new Map(ocupados.map((o) => [aCamion ? o.vehiculoId : o.personalId, o]));
  const bloqueo = (id) => (ocupadoPor.has(id) ? `Ya tiene ${equipoQueYaTiene(categoria, ocupadoPor.get(id), empresasPermitidas)}.` : undefined);

  const base = { destino: destinoApi(categoria), tipoEquipo: categoria.nombre, variasPorDestinatario: categoria.variasPorDestinatario };
  if (aCamion) {
    const vehiculos = await db.vehiculo.findMany({ include: { empresaDuena: true, empresaUso: true }, orderBy: { placa: "asc" } });
    return {
      ...base,
      personas: [],
      camiones: vehiculos.map((v) => ({
        id: v.id,
        placa: v.placa,
        tipoUnidad: ENUM_A_TIPO[v.tipoUnidad],
        cuadrilla: v.cuadrilla,
        empresa: v.empresaDuena.nombre,
        ...(v.empresaUsoId !== v.empresaDuenaId ? { empresaUso: v.empresaUso.nombre } : {}),
        ...(equipo.vehiculoId === v.id ? { actual: true } : {}),
        ...(bloqueo(v.id) ? { bloqueo: bloqueo(v.id) } : {}),
      })),
    };
  }
  const personal = await db.personal.findMany({ include: { contratos: { include: { empresa: true } } }, orderBy: { nombre: "asc" } });
  return {
    ...base,
    camiones: [],
    personas: personal.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      dni: p.dni,
      empresas: [...new Set(p.contratos.map((c) => c.empresa.nombre))],
      ...(equipo.personalId === p.id ? { actual: true } : {}),
      ...(bloqueo(p.id) ? { bloqueo: bloqueo(p.id) } : {}),
    })),
  };
}

/**
 * Pestaña "Asignaciones": cada persona y camión con los equipos que
 * tiene ahora (solo de las empresas que ve el usuario), con su tipo,
 * identificador, estado y vencimiento.
 */
export async function listarAsignacionesActuales(empresasPermitidas) {
  const equipos = await db.equipo.findMany({
    where: { empresa: { slug: { in: empresasPermitidas } }, OR: [{ vehiculoId: { not: null } }, { personalId: { not: null } }] },
    include: INCLUDE,
    orderBy: [{ categoria: { orden: "asc" } }, { id: "asc" }],
  });
  const grupos = new Map();
  for (const e of equipos) {
    const clave = e.vehiculo ? `camion-${e.vehiculo.id}` : `persona-${e.personal.id}`;
    if (!grupos.has(clave)) {
      grupos.set(
        clave,
        e.vehiculo
          ? { clave, tipo: "camion", id: e.vehiculo.id, nombre: e.vehiculo.placa, detalle: [ENUM_A_TIPO[e.vehiculo.tipoUnidad], e.vehiculo.cuadrilla].filter(Boolean).join(" · "), equipos: [] }
          : { clave, tipo: "persona", id: e.personal.id, nombre: e.personal.nombre, detalle: `DNI ${e.personal.dni}`, equipos: [] }
      );
    }
    grupos.get(clave).equipos.push({
      id: e.id,
      identificador: identificadorEquipo(e),
      campoIdentificador: campoIdentificador(e.categoria) === "codigo" && e.codigo ? "Código" : "Serial",
      categoria: e.categoria.nombre,
      estado: estadoEfectivo(e).toLowerCase(),
      vencimiento: e.proximaInspeccion ? formatearFechaDia(e.proximaInspeccion) : null,
      vencimientoIso: isoDia(e.proximaInspeccion),
      ...(estaVencido(e) ? { vencido: true } : {}),
      // Lote solo si su tipo lo pide.
      ...(camposDelTipo(e.categoria)?.includes("lote") ? { lote: e.lote } : {}),
      // Enlaces a sus fotos: se cargan recién al desplegar la fila.
      fotos: urlsFotosActuales(e),
    });
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, vencidos: g.equipos.filter((x) => x.vencido).length }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
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

/**
 * "Actualizar inspección" (también "Renovar fechas" de un equipo vencido).
 * Una sola operación atómica: fechas, aviso, resultado, estado y fotos.
 *   - tipo: si no llega, "interna" (las externas ya no se registran; las
 *     antiguas siguen en el historial tal cual).
 *   - fotos: 2 elementos, cada uno "actual" o una foto nueva; el equipo
 *     queda SIEMPRE con exactamente 2. Las reemplazadas no se borran:
 *     quedan ligadas al historial (fotos_equipo).
 *   - dejarDisponible: si se llegó eligiendo "Disponible" en un equipo
 *     vencido y asignado, al aprobar se libera (como hacía "Renovar
 *     fechas" antes). Si no, aprobado mantiene la asignación.
 * Las fechas nuevas reinician los avisos de vencimiento (salen de
 * proxima_inspeccion) y un vencido vuelve a poder asignarse solo con una
 * fecha de vencimiento de hoy en adelante.
 */
export async function registrarInspeccion(equipoId, { tipo = "interna", fechaInspeccion, fechaVencimiento, diasAnticipacion, resultado, fotos: fotosEntrada, dejarDisponible = false }, empresasPermitidas, usuarioId) {
  await buscarEquipo(equipoId, empresasPermitidas);
  if (tipo !== "interna") throw validacionFallida("Las inspecciones externas ya no se registran: toda inspección nueva es interna, con fotos.");
  if (fechaVencimiento.slice(0, 10) < fechaInspeccion.slice(0, 10)) {
    throw validacionFallida("La fecha de vencimiento no puede ser anterior a la fecha de inspección.");
  }
  const aprobado = resultado === "aprobado";
  // Aprobado deja el equipo en uso (Disponible o asignado): no con una
  // fecha de vencimiento que ya pasó.
  if (aprobado && vencidoPorFecha(new Date(fechaVencimiento.slice(0, 10)))) {
    throw conflicto("La fecha de vencimiento ya pasó: con la inspección aprobada el equipo seguiría vencido. Ingresa una fecha de vencimiento de hoy en adelante.", "EQUIPO_VENCIDO");
  }
  const etiquetaResultado = { aprobado: "Aprobado", observado: "Observado", rechazado: "Rechazado" }[resultado];

  const actualizado = await db.$transaction(async (tx) => {
    const equipo = await bloquearEquipo(tx, equipoId);
    // Con el equipo bloqueado: las fotos que tiene ahora son las que valen.
    const { fotos, reemplazadas, cambiadas } = resolverFotos(fotosEntrada, equipo.fotos);
    // Aprobado: si estaba asignado, sigue asignado al mismo destinatario
    // (salvo dejarDisponible). Observado o rechazado: pasa a mantenimiento
    // y se libera.
    const sigueAsignado = aprobado && equipo.estado === "ASIGNADO" && !dejarDisponible;
    const estabaVencido = estaVencido(equipo);
    const tenia = sigueAsignado ? null : await cerrarAsignacion(tx, equipo, aprobado ? "Devuelto" : `Inspección ${etiquetaResultado.toLowerCase()}`);
    const act = await tx.equipo.update({
      where: { id: equipoId },
      data: {
        estado: sigueAsignado ? "ASIGNADO" : aprobado ? "DISPONIBLE" : "MANTENIMIENTO",
        ...(sigueAsignado ? {} : SIN_DESTINATARIO),
        ultimaInspeccion: new Date(fechaInspeccion),
        proximaInspeccion: new Date(fechaVencimiento),
        fotos,
        // Antes este valor del modal se descartaba y se avisaba siempre
        // con 15 días fijos.
        ...(diasAnticipacion !== undefined ? { diasAnticipacionInspeccion: diasAnticipacion } : {}),
      },
      include: INCLUDE,
    });
    const idsFotos = await guardarFotos(tx, equipoId, fotos);
    const idsReemplazadas = await guardarFotos(tx, equipoId, reemplazadas);
    const partes = [
      `Inspección interna — ${etiquetaResultado}`,
      ...(aprobado && estabaVencido ? [`fechas renovadas, vence ${formatearFechaDia(new Date(fechaVencimiento.slice(0, 10)))}`] : []),
      ...(cambiadas.length ? [textoFotosCambiadas(cambiadas)] : []),
    ];
    await tx.historialEquipo.create({
      data: {
        equipoId,
        titulo: `${partes.join(" — ")}${seLibero(tenia)}`,
        tono: aprobado ? "success" : "volt",
        usuarioId,
        datos: { tipoInspeccion: "interna", resultado, fotos: idsFotos, reemplazadas: idsReemplazadas },
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

  // Fotos de cada inspección o cambio de fotos (las reemplazadas
  // incluidas), como enlaces que se cargan al verlas.
  const url = (id) => `/api/equipos/${equipoId}/fotos/${id}`;
  return equipo.historial.map((h) => ({
    titulo: h.titulo,
    fecha: formatearFecha(h.creadoEn),
    actor: h.usuario?.nombre || "Sistema",
    ...(h.tono ? { tone: h.tono } : {}),
    ...(h.datos?.fotos?.length ? { fotos: h.datos.fotos.map(url) } : {}),
    ...(h.datos?.reemplazadas?.length ? { fotosReemplazadas: h.datos.reemplazadas.map(url) } : {}),
  }));
}

/**
 * Foto actual del equipo (1 o 2) como imagen, para las tarjetas de
 * Equipos, el visor, "Editar fotos" y las miniaturas de Asignaciones.
 * `inmutable`: la versión pedida es la vigente, así que el navegador la
 * puede guardar en caché sin volver a pedirla.
 *
 * Mismo control que buscarEquipo (404 si no existe, 403 si es de otra
 * empresa), pero trae solo la foto pedida y la empresa, no el equipo
 * completo con sus 2 fotos y sus relaciones.
 */
export async function obtenerFotoActual(equipoId, posicion, version, empresasPermitidas) {
  const indice = [1, 2].includes(posicion) ? posicion - 1 : -1;
  // Fuera del rango de un int de Postgres sería un error 500: es un 404.
  const [fila] = Number.isInteger(equipoId) && equipoId > 0 && equipoId <= 2147483647
    ? await db.$queryRaw`
        SELECT em.slug, CASE WHEN jsonb_typeof(e.fotos) = 'array' THEN e.fotos ->> ${indice}::int END AS data
        FROM equipos e JOIN empresas em ON em.id = e.empresa_id
        WHERE e.id = ${equipoId}`
    : [];
  if (!fila) throw new ApiError(404, "NO_ENCONTRADO", "El equipo no existe.");
  verificarAccesoEmpresa(fila.slug, empresasPermitidas);
  const data = indice >= 0 ? fila.data : null;
  if (!data) throw new ApiError(404, "NO_ENCONTRADO", "La foto no existe.");
  return { ...decodificarFoto(data), inmutable: version === versionFoto(data) };
}

/** Una foto guardada del historial (o actual) del equipo, como imagen. */
export async function obtenerFotoEquipo(equipoId, fotoId, empresasPermitidas) {
  await buscarEquipo(equipoId, empresasPermitidas);
  const foto = Number.isInteger(fotoId) ? await db.fotoEquipo.findFirst({ where: { id: fotoId, equipoId } }) : null;
  if (!foto) throw new ApiError(404, "NO_ENCONTRADO", "La foto no existe.");
  return decodificarFoto(foto.data);
}
