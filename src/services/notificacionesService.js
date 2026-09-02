import { apiClient, delay } from "./apiClient";

const MOCK_MODE = true;

// TODO backend: GET /api/alertas?estado=PENDIENTE&limit= (ordenadas por
// días restantes) — este es el motor central de Vencimientos, mezcla
// Contrato/Curso/Equipo/Vehículo/Factura por igual, sin darle prioridad
// a ningún módulo. `tipo` decide qué ícono y a qué pantalla navegar
// (ver ICONO_POR_TIPO / RUTA_POR_TIPO en quien consuma este servicio).
const ALERTAS_MOCK = [
  { id: "emo-1", tipo: "curso", titulo: "EMO — Milagros Ríos", empresa: "Corevex", fechaVencimiento: "2026-09-03" },
  { id: "contrato-1", tipo: "contrato", titulo: "Contrato — J. Ramírez Soto", empresa: "Corevex", fechaVencimiento: "2026-09-05" },
  { id: "equipo-1", tipo: "equipo", titulo: "Inspección — Arnés AR-014", empresa: "Electro", fechaVencimiento: "2026-09-10" },
  { id: "vehiculo-1", tipo: "vehiculo", titulo: "SOAT — Vehículo ABC-123", empresa: "Corevex", fechaVencimiento: "2026-09-23" },
  { id: "factura-1", tipo: "factura", titulo: "Factura #F001-00234 por cobrar", empresa: "Corevex", fechaVencimiento: "2026-10-01" },
];

function diasParaVencer(fechaISO) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaISO + "T00:00:00");
  return Math.round((venc - hoy) / (1000 * 60 * 60 * 24));
}

export async function listarAlertas({ limit } = {}) {
  if (MOCK_MODE) {
    await delay();
    const conDias = ALERTAS_MOCK.map((a) => ({ ...a, dias: diasParaVencer(a.fechaVencimiento) })).sort(
      (a, b) => a.dias - b.dias
    );
    return limit ? conDias.slice(0, limit) : conDias;
  }
  // TODO backend: GET /api/alertas?estado=PENDIENTE&limit=
  return apiClient.get("/alertas", { estado: "PENDIENTE", limit });
}

// TODO backend: GET /api/registro-actividad?limit= (tabla RegistroActividad)
const ACTIVIDAD_MOCK = [
  { iniciales: "CC", texto: "<b>Cristian</b> registró un pago parcial en Factura F001-00229", tiempo: "Hace 12 min" },
  { iniciales: "MR", texto: "<b>Milagros</b> asignó el equipo EQ-072 a J. Ramírez", tiempo: "Hace 1 h" },
  { iniciales: "CC", texto: "<b>Cristian</b> creó el contrato de S. Vega Luna", tiempo: "Ayer, 5:40 p.m." },
  { iniciales: "AT", texto: "<b>Alonso</b> marcó como resuelta la alerta de SOAT DEF-456", tiempo: "Ayer, 2:15 p.m." },
];

export async function listarActividadReciente({ limit = 4 } = {}) {
  if (MOCK_MODE) {
    await delay();
    return ACTIVIDAD_MOCK.slice(0, limit);
  }
  // TODO backend: GET /api/registro-actividad?limit=
  return apiClient.get("/registro-actividad", { limit });
}
