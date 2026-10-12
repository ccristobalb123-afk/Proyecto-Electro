import { db } from "../lib/db.js";
import { enviarAUsuariosConAcceso } from "./push.service.js";
import { TIPO_CURSO_A_TEXTO, diasHasta } from "../lib/estadoVencimiento.js";
import { nombreDocumento, documentoPorVencer } from "../lib/documentosVehiculo.js";

// Antes cada servicio tenía su copia, con el desfase de un día (ver
// diasHasta en lib/estadoVencimiento.js).
const diasRestantes = diasHasta;

// Evita mandar la misma alerta muchas veces el mismo día (el chequeo
// puede correr más de una vez, o el servidor reiniciarse) — pero SÍ
// vuelve a notificar al día siguiente si el vencimiento sigue vigente,
// como cualquier recordatorio que se va acercando.
async function yaNotificadoHoy(tipo, entidadId) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const existente = await db.alertaNotificada.findUnique({
    where: { tipo_entidadId_fecha: { tipo, entidadId, fecha: hoy } },
  });
  return !!existente;
}

async function marcarNotificadoHoy(tipo, entidadId) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  await db.alertaNotificada.create({ data: { tipo, entidadId, fecha: hoy } }).catch(() => {});
  // .catch: si 2 corridas del chequeo se pisan justo en el mismo
  // instante, el @@unique ya evita el duplicado — no hace falta que
  // esto tire un error no controlado por esa carrera rarísima.
}

async function revisarContratos() {
  const contratos = await db.contrato.findMany({
    where: { estadoManual: null },
    include: { personal: true, empresa: true },
  });
  for (const c of contratos) {
    const dias = diasRestantes(c.fechaFin);
    if (dias < 0 || dias > c.diasAnticipacion) continue;
    if (await yaNotificadoHoy("contrato", c.id)) continue;

    // Solo a quien tenga acceso a RRHH en la empresa de ESTE contrato.
    await enviarAUsuariosConAcceso({ modulo: "rrhh", empresas: [c.empresa.slug] }, {
      titulo: dias === 0 ? "Contrato vence hoy" : "Contrato por vencer",
      cuerpo: `El contrato de ${c.personal.nombre} vence ${dias === 0 ? "hoy" : `en ${dias} día(s)`}.`,
      url: "/rrhh",
    });
    await marcarNotificadoHoy("contrato", c.id);
  }
}

async function revisarCursos() {
  const cursos = await db.curso.findMany({
    where: { estadoManual: null },
    include: { personal: true, empresa: true },
  });
  for (const c of cursos) {
    const dias = diasRestantes(c.fechaVencimiento);
    if (dias < 0 || dias > c.diasAnticipacion) continue;
    if (await yaNotificadoHoy("curso", c.id)) continue;

    const tipo = TIPO_CURSO_A_TEXTO[c.tipo];
    await enviarAUsuariosConAcceso({ modulo: "rrhh", empresas: [c.empresa.slug] }, {
      titulo: `${tipo} por vencer`,
      cuerpo: `El ${tipo === "EMO" ? "EMO" : tipo.toLowerCase()} de ${c.personal.nombre} vence ${dias === 0 ? "hoy" : `en ${dias} día(s)`}.`,
      url: "/rrhh",
    });
    await marcarNotificadoHoy("curso", c.id);
  }
}

async function revisarDocumentosVehiculo() {
  const documentos = await db.documentoVehiculo.findMany({
    where: { fechaVencimiento: { not: null } },
    include: { vehiculo: { include: { empresaDuena: true, empresaUso: true } } },
  });
  // Cada documento usa SUS días de anticipación (antes era un umbral
  // fijo de 45 días para todos) — el mismo criterio que pinta "Por
  // vencer" en la pantalla (lib/documentosVehiculo.js). Una alerta por
  // documento por día como máximo (yaNotificadoHoy).
  for (const d of documentos) {
    if (!documentoPorVencer(d)) continue;
    const dias = diasHasta(d.fechaVencimiento);
    if (await yaNotificadoHoy("documento_vehiculo", d.id)) continue;

    // El camión puede ser dueño de una empresa y estar en uso de la
    // otra (mismo criterio que en vehiculos.service.js) — avisa a
    // quien tenga acceso a cualquiera de las dos.
    const empresas = [...new Set([d.vehiculo.empresaDuena.slug, d.vehiculo.empresaUso.slug])];
    await enviarAUsuariosConAcceso({ modulo: "operaciones", empresas }, {
      titulo: `${nombreDocumento(d)} por vencer`,
      cuerpo: `${nombreDocumento(d)} del vehículo ${d.vehiculo.placa}: vence ${dias === 0 ? "hoy" : `en ${dias} día(s)`}.`,
      url: "/operaciones",
    });
    await marcarNotificadoHoy("documento_vehiculo", d.id);
  }
}

async function revisarInspeccionesEquipo() {
  const equipos = await db.equipo.findMany({
    where: { proximaInspeccion: { not: null }, estado: { notIn: ["DEBAJA"] } },
    include: { empresa: true },
  });
  for (const eq of equipos) {
    const dias = diasRestantes(eq.proximaInspeccion);
    if (dias < 0 || dias > 15) continue; // ventana más corta — es una inspección física, no un papel
    if (await yaNotificadoHoy("equipo_inspeccion", eq.id)) continue;

    await enviarAUsuariosConAcceso({ modulo: "operaciones", empresas: [eq.empresa.slug] }, {
      titulo: "Inspección de equipo por vencer",
      cuerpo: `El equipo ${eq.codigo} necesita su próxima inspección ${dias === 0 ? "hoy" : `en ${dias} día(s)`}.`,
      url: "/operaciones",
    });
    await marcarNotificadoHoy("equipo_inspeccion", eq.id);
  }
}

export async function revisarVencimientosYNotificar() {
  await revisarContratos();
  await revisarCursos();
  await revisarDocumentosVehiculo();
  await revisarInspeccionesEquipo();
}
