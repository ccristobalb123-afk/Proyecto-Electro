// ============================================================
// Avisos de vencimiento: QUÉ hay que avisar (una sola recolección) y
// el envío push diario. La campana y el Dashboard usan listarAvisos();
// el chequeo programado usa notificarVencimientos(). Los textos salen
// siempre de construirMensaje (lib/mensajesAlerta.js).
// ============================================================
import { db } from "../lib/db.js";
import { diasHasta, TIPO_CURSO_A_TEXTO } from "../lib/estadoVencimiento.js";
import { infoDocumento, nombreDocumento } from "../lib/documentosVehiculo.js";
import { calcularEstadoPago, montoNetoAPagar } from "../lib/estadoPago.js";
import { modulosDe } from "../lib/roles.js";
import {
  crearAviso,
  construirMensaje,
  construirResumen,
  porUrgencia,
  DIAS_AVISO_DESPUES_DE_VENCER,
  DIAS_AVISO_FACTURA,
  MAX_PUSH_INDIVIDUALES,
} from "../lib/mensajesAlerta.js";
import { enviarAUsuario } from "./push.service.js";

// Solo se traen de la base los registros que PUEDEN estar en ventana:
// desde DIAS_AVISO_DESPUES_DE_VENCER días atrás. El tope superior lo
// decide cada registro con sus días de anticipación (crearAviso).
function desdeFecha() {
  const h = new Date();
  return new Date(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate() - DIAS_AVISO_DESPUES_DE_VENCER));
}

/**
 * Todos los avisos que corresponden HOY (por vencer, vence hoy, vencido
 * hace 1..3 días): lo que se manda por push. La campana y el Dashboard
 * agregan además las facturas impagas vencidas hace más tiempo (ver
 * listarAvisos).
 */
export async function recolectarAvisos() {
  const desde = desdeFecha();
  const avisos = [];
  const agregar = (aviso) => aviso && avisos.push(aviso);

  // Contratos y Cursos/EMO: un estado manual (Renovado/Terminado) no avisa.
  const contratos = await db.contrato.findMany({
    where: { estadoManual: null, fechaFin: { gte: desde } },
    include: { personal: true, empresa: true },
  });
  for (const c of contratos) {
    agregar(
      crearAviso({
        tipo: "contrato", entidadId: c.id, claveDedupe: "contrato",
        que: "Contrato", genero: "m", sujeto: `Contrato de ${c.personal.nombre}`,
        fecha: c.fechaFin, diasAnticipacion: c.diasAnticipacion,
        empresa: c.empresa.nombre, empresas: [c.empresa.slug], modulo: "rrhh",
        url: `/rrhh?q=${encodeURIComponent(c.personal.dni)}`,
      })
    );
  }

  const cursos = await db.curso.findMany({
    where: { estadoManual: null, fechaVencimiento: { gte: desde } },
    include: { personal: true, empresa: true },
  });
  for (const c of cursos) {
    const tipo = TIPO_CURSO_A_TEXTO[c.tipo];
    agregar(
      crearAviso({
        tipo: "curso", entidadId: c.id, claveDedupe: "curso",
        que: tipo, genero: "m", sujeto: `${tipo} de ${c.personal.nombre}`,
        fecha: c.fechaVencimiento, diasAnticipacion: c.diasAnticipacion,
        empresa: c.empresa.nombre, empresas: [c.empresa.slug], modulo: "rrhh",
        url: `/rrhh?tab=cursos&q=${encodeURIComponent(c.personal.dni)}`,
      })
    );
  }

  // Documentos de vehículo: solo los del catálogo con vencimiento. Los
  // que "No vence" (sin fecha) y los del sistema anterior no avisan.
  const documentos = await db.documentoVehiculo.findMany({
    where: { tipoDocumento: { not: null }, fechaVencimiento: { gte: desde } },
    include: { vehiculo: { include: { empresaDuena: true, empresaUso: true } } },
  });
  for (const d of documentos) {
    const { frase, genero, plural } = infoDocumento(d.tipoDocumento).aviso;
    const v = d.vehiculo;
    agregar(
      crearAviso({
        tipo: "vehiculo", entidadId: d.id, claveDedupe: "documento_vehiculo",
        que: nombreDocumento(d), genero, plural, sujeto: `${frase} del vehículo ${v.placa}`,
        fecha: d.fechaVencimiento, diasAnticipacion: d.diasAnticipacion,
        // Dueña y de uso pueden ser distintas: avisa a quien vea cualquiera.
        empresa: v.empresaDuena.nombre, empresas: [...new Set([v.empresaDuena.slug, v.empresaUso.slug])], modulo: "operaciones",
        url: `/operaciones?tab=vehiculos&q=${encodeURIComponent(v.placa)}`,
      })
    );
  }

  const equipos = await db.equipo.findMany({
    where: { proximaInspeccion: { gte: desde }, estado: { not: "DEBAJA" } },
    include: { empresa: true },
  });
  for (const eq of equipos) {
    agregar(
      crearAviso({
        tipo: "equipo", entidadId: eq.id, claveDedupe: "equipo_inspeccion",
        que: "Inspección", genero: "f", sujeto: `Inspección del equipo ${eq.codigo}`,
        fecha: eq.proximaInspeccion, diasAnticipacion: eq.diasAnticipacionInspeccion,
        empresa: eq.empresa.nombre, empresas: [eq.empresa.slug], modulo: "operaciones",
        url: `/operaciones?q=${encodeURIComponent(eq.codigo)}`,
      })
    );
  }

  avisos.push(...(await avisosDeFacturas({ desde })));
  return avisos;
}

// Facturas por cobrar y por pagar, mientras estén impagas (ni anuladas
// ni pagadas: lo pagado se mide contra el monto NETO, sin la detracción,
// igual que en Finanzas — antes se comparaba con el total y una factura
// con detracción ya pagada seguía avisando).
//   - Push (`desde`): la misma regla que todo lo demás — desde 30 días
//     antes hasta 3 días después de vencer.
//   - Campana y Dashboard (`desde` null): además, siguen visibles todo el
//     tiempo que sigan impagas después de vencer.
async function avisosDeFacturas({ desde = null, empresas = null } = {}) {
  const where = {
    anulada: false,
    ...(desde ? { fechaVencimiento: { gte: desde } } : {}),
    ...(empresas ? { empresa: { slug: { in: empresas } } } : {}),
  };
  const [porCobrar, porPagar] = await Promise.all([
    db.factura.findMany({ where, include: { pagos: true, empresa: true } }),
    db.facturaPorPagar.findMany({ where, include: { pagos: true, empresa: true } }),
  ]);
  const impaga = (f) => calcularEstadoPago(montoNetoAPagar(f.montoTotal, f.montoDetraccion), f.pagos) !== "pagado";
  // Vencida hace más de 3 días: solo para la campana y el Dashboard.
  const faseFija = (f) => (desde ? undefined : diasHasta(f.fechaVencimiento) < 0 ? "vencido" : undefined);

  const avisos = [];
  for (const f of porCobrar.filter(impaga)) {
    avisos.push(
      crearAviso({
        tipo: "factura", entidadId: f.id, claveDedupe: "factura",
        que: "Cobro de factura", genero: "m", sujeto: `El cobro de la factura ${f.serie}-${f.numero} (${f.cliente})`,
        fecha: f.fechaVencimiento, diasAnticipacion: DIAS_AVISO_FACTURA, faseFija: faseFija(f),
        empresa: f.empresa.nombre, empresas: [f.empresa.slug], modulo: "finanzas",
        url: `/finanzas?q=${encodeURIComponent(f.cliente)}`,
      })
    );
  }
  for (const f of porPagar.filter(impaga)) {
    avisos.push(
      crearAviso({
        tipo: "facturaPagar", entidadId: f.id, claveDedupe: "factura_por_pagar",
        que: "Pago a proveedor", genero: "m", sujeto: `El pago a ${f.proveedor} (${f.motivo})`,
        fecha: f.fechaVencimiento, diasAnticipacion: DIAS_AVISO_FACTURA, faseFija: faseFija(f),
        empresa: f.empresa.nombre, empresas: [f.empresa.slug], modulo: "finanzas",
        url: `/finanzas?tab=facturasPagar&q=${encodeURIComponent(f.proveedor)}`,
      })
    );
  }
  return avisos.filter(Boolean);
}

function puedeVer(aviso, empresas, modulos) {
  return modulos.includes(aviso.modulo) && aviso.empresas.some((e) => empresas.includes(e));
}

/**
 * Lo que ve un usuario en la campana y el Dashboard: solo de sus
 * empresas y módulos, ordenado por urgencia, con el texto del
 * constructor único. La empresa se nombra si ve más de una.
 */
export async function listarAvisos(usuario, empresasPermitidas, { limit } = {}) {
  const modulos = modulosDe(usuario);
  // Todo menos las facturas (que en la campana siguen visibles mientras
  // estén impagas, no solo 3 días después de vencer).
  const avisos = (await recolectarAvisos()).filter((a) => !a.tipo.startsWith("factura") && puedeVer(a, empresasPermitidas, modulos));
  if (modulos.includes("finanzas")) avisos.push(...(await avisosDeFacturas({ empresas: empresasPermitidas })));
  const mensajes = avisos.map((a) => construirMensaje(a, { incluirEmpresa: empresasPermitidas.length > 1 })).sort(porUrgencia);
  return limit ? mensajes.slice(0, limit) : mensajes;
}

// "Hoy" para la columna DATE de AlertaNotificada: la fecha LOCAL de
// calendario, armada en UTC (con medianoche local, en zonas al este de
// UTC se guardaba el día anterior).
function hoyComoFecha() {
  const h = new Date();
  return new Date(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate()));
}

// Reserva el aviso de hoy ANTES de enviarlo: si dos chequeos corren a
// la vez (un reinicio de PM2 justo durante el chequeo programado), solo
// uno logra crear la fila (clave única tipo + registro + día) y el otro
// no lo manda. Antes se marcaba después de enviar, y los dos podían
// mandarlo. (Si el envío en sí fallara, ese aviso no se reintenta hasta
// el día siguiente: se prefiere eso a avisar dos veces.)
async function reservarAvisoDeHoy(aviso) {
  // skipDuplicates = ON CONFLICT DO NOTHING: atómico como un create, pero
  // sin lanzar (ni ensuciar el log de PM2) cuando ya se avisó hoy.
  const { count } = await db.alertaNotificada.createMany({
    data: [{ tipo: aviso.claveDedupe, entidadId: aviso.entidadId, fecha: hoyComoFecha() }],
    skipDuplicates: true,
  });
  return count === 1;
}

/**
 * Chequeo diario de push. A cada usuario le llegan los avisos nuevos de
 * hoy de sus empresas y módulos: 1 o 2 individuales; más, agrupados en
 * uno solo ("Tienes 6 documentos por atender").
 * @param {object} [opciones]
 * @param {(usuarioId, payload) => Promise} [opciones.enviar] para pruebas (envío simulado)
 * @returns {Promise<Array<{usuarioId, payloads}>>} lo que se envió
 */
export async function notificarVencimientos({ enviar = enviarAUsuario } = {}) {
  const nuevos = [];
  for (const aviso of await recolectarAvisos()) {
    if (await reservarAvisoDeHoy(aviso)) nuevos.push(aviso);
  }
  if (nuevos.length === 0) return [];

  const usuarios = await db.usuario.findMany({
    where: { activo: true },
    include: { empresas: { include: { empresa: true } }, modulos: true },
  });

  const enviados = [];
  for (const usuario of usuarios) {
    const empresas = usuario.empresas.map((ue) => ue.empresa.slug);
    const suyos = nuevos.filter((a) => puedeVer(a, empresas, modulosDe(usuario))).sort(porUrgencia);
    if (suyos.length === 0) continue;

    const payloads =
      suyos.length > MAX_PUSH_INDIVIDUALES
        ? [{ ...construirResumen(suyos), tag: "resumen-vencimientos" }]
        : suyos.map((a) => {
            const m = construirMensaje(a, { incluirEmpresa: empresas.length > 1 });
            return { titulo: m.titulo, cuerpo: m.cuerpo, url: m.url, tag: m.id };
          });
    for (const payload of payloads) await enviar(usuario.id, payload);
    enviados.push({ usuarioId: usuario.id, payloads });
  }
  return enviados;
}
