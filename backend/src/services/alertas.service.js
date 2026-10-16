// ============================================================
// Avisos de vencimiento: QUÉ hay que avisar (una sola recolección) y
// el envío push diario. La campana y el Dashboard usan listarAvisos();
// el chequeo programado usa notificarVencimientos(). Los textos salen
// siempre de construirMensaje (lib/mensajesAlerta.js).
// ============================================================
import { db } from "../lib/db.js";
import { TIPO_CURSO_A_TEXTO } from "../lib/estadoVencimiento.js";
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
import { identificadorEquipo } from "./equipos.service.js";
import { enviarAUsuario } from "./push.service.js";

// Solo se traen de la base los registros que PUEDEN estar en ventana:
// desde DIAS_AVISO_DESPUES_DE_VENCER días atrás. El tope superior lo
// decide cada registro con sus días de anticipación (crearAviso).
function desdeFecha() {
  const h = new Date();
  return new Date(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate() - DIAS_AVISO_DESPUES_DE_VENCER));
}

/**
 * Avisos de hoy, en uno de dos modos (mismos registros, mismo texto):
 *   - "push":  por vencer, vence hoy y vencido hace 1..3 días
 *              (DIAS_AVISO_DESPUES_DE_VENCER) — lo que se envía.
 *   - "lista": por vencer, vence hoy y TODO lo vencido hasta que se
 *              renueve — lo que muestran la campana y el Dashboard.
 * Nunca aparecen: "No vence", documentos del sistema anterior, registros
 * con estado manual, equipos de baja y facturas pagadas o anuladas.
 */
export async function recolectarAvisos({ modo = "push" } = {}) {
  const lista = modo === "lista";
  // En push solo se traen de la base los que pueden estar en ventana.
  const desde = lista ? undefined : desdeFecha();
  // En la lista no se acota por fecha: lo vencido aparece hasta que se
  // renueve. Lo que no tiene fecha se excluye explícitamente más abajo.
  const filtroFecha = (campo) => (desde ? { [campo]: { gte: desde } } : {});
  const avisos = [];
  const agregar = (aviso) => aviso && avisos.push(aviso);
  const base = { vencidoSinLimite: lista };

  // Contratos y Cursos/EMO: un estado manual (Renovado/Terminado) no avisa.
  const contratos = await db.contrato.findMany({
    where: { estadoManual: null, ...filtroFecha("fechaFin") },
    include: { personal: true, empresa: true },
  });
  for (const c of contratos) {
    agregar(
      crearAviso({
        ...base,
        tipo: "contrato", entidadId: c.id, claveDedupe: "contrato",
        que: "Contrato", genero: "m", sujeto: `Contrato de ${c.personal.nombre}`,
        fecha: c.fechaFin, diasAnticipacion: c.diasAnticipacion,
        empresa: c.empresa.nombre, empresas: [c.empresa.slug], modulo: "rrhh",
        url: `/rrhh?q=${encodeURIComponent(c.personal.dni)}`,
      })
    );
  }

  const cursos = await db.curso.findMany({
    where: { estadoManual: null, ...filtroFecha("fechaVencimiento") },
    include: { personal: true, empresa: true },
  });
  for (const c of cursos) {
    const tipo = TIPO_CURSO_A_TEXTO[c.tipo];
    agregar(
      crearAviso({
        ...base,
        tipo: "curso", entidadId: c.id, claveDedupe: "curso",
        // "Curso Trabajo en altura (TA-01) de Juan Pérez" — de qué curso y de quién.
        que: tipo, genero: "m",
        sujeto: c.tipo === "CURSO" && c.nombreCurso ? `Curso ${c.nombreCurso} (${c.codigoCurso}) de ${c.personal.nombre}` : `${tipo} de ${c.personal.nombre}`,
        fecha: c.fechaVencimiento, diasAnticipacion: c.diasAnticipacion,
        empresa: c.empresa.nombre, empresas: [c.empresa.slug], modulo: "rrhh",
        url: `/rrhh?tab=cursos&q=${encodeURIComponent(c.personal.dni)}`,
      })
    );
  }

  // Documentos de vehículo: solo los del catálogo con vencimiento. Los
  // que "No vence" (sin fecha) y los del sistema anterior no avisan.
  const documentos = await db.documentoVehiculo.findMany({
    // Sin fecha = "No vence": nunca avisa ni aparece.
    where: { tipoDocumento: { not: null }, fechaVencimiento: { not: null }, ...filtroFecha("fechaVencimiento") },
    include: { vehiculo: { include: { empresaDuena: true, empresaUso: true } } },
  });
  for (const d of documentos) {
    const { frase, genero, plural } = infoDocumento(d.tipoDocumento).aviso;
    const v = d.vehiculo;
    agregar(
      crearAviso({
        ...base,
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
    where: { proximaInspeccion: { not: null }, ...filtroFecha("proximaInspeccion"), estado: { not: "DEBAJA" } },
    include: { empresa: true },
  });
  for (const eq of equipos) {
    agregar(
      crearAviso({
        ...base,
        tipo: "equipo", entidadId: eq.id, claveDedupe: "equipo_inspeccion",
        que: "Inspección", genero: "f", sujeto: `Inspección del equipo ${identificadorEquipo(eq)}`,
        fecha: eq.proximaInspeccion, diasAnticipacion: eq.diasAnticipacionInspeccion,
        empresa: eq.empresa.nombre, empresas: [eq.empresa.slug], modulo: "operaciones",
        url: `/operaciones?q=${encodeURIComponent(identificadorEquipo(eq))}`,
      })
    );
  }

  avisos.push(...(await avisosDeFacturas({ desde, lista })));
  return avisos;
}

// Facturas por cobrar y por pagar, mientras estén impagas (ni anuladas
// ni pagadas: lo pagado se mide contra el monto NETO, sin la detracción,
// igual que en Finanzas). Misma regla que todo lo demás: en push hasta
// 3 días después de vencer; en la lista, mientras sigan impagas.
async function avisosDeFacturas({ desde, lista, empresas = null } = {}) {
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

  const avisos = [];
  for (const f of porCobrar.filter(impaga)) {
    avisos.push(
      crearAviso({
        tipo: "factura", entidadId: f.id, claveDedupe: "factura",
        que: "Cobro de factura", genero: "m", sujeto: `El cobro de la factura ${f.serie}-${f.numero} (${f.cliente})`,
        fecha: f.fechaVencimiento, diasAnticipacion: DIAS_AVISO_FACTURA, vencidoSinLimite: lista,
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
        fecha: f.fechaVencimiento, diasAnticipacion: DIAS_AVISO_FACTURA, vencidoSinLimite: lista,
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
  const avisos = (await recolectarAvisos({ modo: "lista" })).filter((a) => puedeVer(a, empresasPermitidas, modulos));
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
  for (const aviso of await recolectarAvisos({ modo: "push" })) {
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
