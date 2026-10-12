import { db } from "../lib/db.js";
import { totalPagado } from "../lib/estadoPago.js";
import { diasHasta } from "../lib/estadoVencimiento.js";
import { listarAvisos } from "./alertas.service.js";


// Los vehículos pueden ser dueños de una empresa y estar en uso de la
// otra (ver vehiculos.service.js) — por eso, para vehículos, "acceso"
// es OR entre dueña y uso, no una sola columna.
function filtroEmpresaVehiculo(empresasPermitidas) {
  return {
    OR: [
      { empresaDuena: { slug: { in: empresasPermitidas } } },
      { empresaUso: { slug: { in: empresasPermitidas } } },
    ],
  };
}

// ---- KPIs de la fila superior ----
// Todo lo que ve el Dashboard se restringe a las empresas del usuario
// que lo está mirando — antes esto mezclaba Corevex + Electro sin
// importar a cuál pertenecía de verdad.
export async function obtenerKpis(empresasPermitidas, usuario) {
  const filtroEmpresa = { empresa: { slug: { in: empresasPermitidas } } };

  const [contratos, totalEquipos, disponibles, facturas, avisos] = await Promise.all([
    db.contrato.findMany({ where: { estadoManual: null, ...filtroEmpresa } }),
    db.equipo.count({ where: { estado: { not: "DEBAJA" }, ...filtroEmpresa } }),
    db.equipo.count({ where: { estado: "DISPONIBLE", ...filtroEmpresa } }),
    db.factura.findMany({ where: { anulada: false, ...filtroEmpresa }, include: { pagos: true } }),
    listarAvisos(usuario, empresasPermitidas),
  ]);

  const contratosPorVencer = contratos.filter((c) => {
    const dias = diasHasta(c.fechaFin);
    return dias >= 0 && dias <= c.diasAnticipacion;
  }).length;

  const porCobrar = facturas.reduce((acc, f) => {
    const saldo = Number(f.montoTotal) - totalPagado(f.pagos);
    return acc + Math.max(0, saldo);
  }, 0);

  return {
    contratosPorVencer,
    equiposDisponibles: `${disponibles}/${totalEquipos}`,
    porCobrar,
    // La MISMA lista que muestran la campana y el panel de vencimientos
    // (alertas.service.js) — antes se recontaba acá con otros criterios
    // y el número podía no coincidir con la campana.
    alertasPendientes: avisos.length,
  };
}

// ---- Panel de vencimientos y campana ----
// Misma recolección y mismo texto que el push (alertas.service.js).
export async function listarAlertas({ limit } = {}, empresasPermitidas, usuario) {
  return listarAvisos(usuario, empresasPermitidas, { limit });
}

// ---- Panel de "Actividad reciente" ----
export async function listarActividadReciente({ limit = 4 } = {}, empresasPermitidas) {
  const [historialEquipos, historialVehiculos] = await Promise.all([
    db.historialEquipo.findMany({
      where: { equipo: { empresa: { slug: { in: empresasPermitidas } } } },
      orderBy: { creadoEn: "desc" },
      take: limit,
      include: { equipo: true, usuario: true },
    }),
    db.historialVehiculo.findMany({
      where: { vehiculo: filtroEmpresaVehiculo(empresasPermitidas) },
      orderBy: { creadoEn: "desc" },
      take: limit,
      include: { vehiculo: true, usuario: true },
    }),
  ]);

  // "Sistema" solo cuando el registro no tiene un usuario asociado
  // (ej. datos sembrados por el seed) — el resto ya trae quién hizo
  // el cambio de verdad, gracias al usuarioId que ahora se guarda en
  // cada línea de historial.
  function iniicialesDe(nombre) {
    return nombre
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  const combinado = [
    ...historialEquipos.map((h) => ({
      iniciales: h.usuario ? iniicialesDe(h.usuario.nombre) : "SYS",
      actor: h.usuario?.nombre || "Sistema",
      accion: h.titulo.toLowerCase(),
      detalle: h.equipo.codigo,
      creadoEn: h.creadoEn,
    })),
    ...historialVehiculos.map((h) => ({
      iniciales: h.usuario ? iniicialesDe(h.usuario.nombre) : "SYS",
      actor: h.usuario?.nombre || "Sistema",
      accion: h.titulo.toLowerCase(),
      detalle: h.vehiculo.placa,
      creadoEn: h.creadoEn,
    })),
  ];

  combinado.sort((a, b) => b.creadoEn - a.creadoEn);
  return combinado.slice(0, limit).map(({ creadoEn, ...resto }) => ({
    ...resto,
    tiempo: formatearTiempoRelativo(creadoEn),
  }));
}

function formatearTiempoRelativo(fecha) {
  const minutos = Math.round((new Date() - new Date(fecha)) / (60 * 1000));
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "Ayer" : `Hace ${dias} días`;
}

// ---- Gráfico comparativo (facturado vs gastado por empresa) ----
export async function obtenerComparativo(empresasPermitidas) {
  const MESES_ATRAS = 6;
  const ahora = new Date();
  const meses = [];
  for (let i = MESES_ATRAS - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    meses.push({ anio: d.getFullYear(), mes: d.getMonth() });
  }

  // En UTC: la columna es DATE; con medianoche local (05:00 UTC) se
  // dejaba fuera lo emitido el día 1 del primer mes.
  const inicio = new Date(Date.UTC(meses[0].anio, meses[0].mes, 1));
  const filtroEmpresa = { empresa: { slug: { in: empresasPermitidas } } };
  const [facturas, gastos, empresas] = await Promise.all([
    db.factura.findMany({ where: { fechaEmision: { gte: inicio }, anulada: false, ...filtroEmpresa }, include: { empresa: true } }),
    db.gasto.findMany({ where: { fecha: { gte: inicio }, ...filtroEmpresa }, include: { empresa: true } }),
    db.empresa.findMany({ where: { slug: { in: empresasPermitidas } } }),
  ]);

  const NOMBRES_MES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const labels = meses.map((m) => `${NOMBRES_MES[m.mes]} ${m.anio}`);

  function serieVacia() {
    return meses.map(() => 0);
  }

  const resultado = { labels };
  for (const empresa of empresas) {
    resultado[`${empresa.slug}Facturado`] = serieVacia();
    resultado[`${empresa.slug}Gastado`] = serieVacia();
  }

  function indiceDeMes(fecha) {
    // Partes UTC (columna DATE): si no, lo del día 1 caía en el mes anterior.
    const d = new Date(fecha);
    return meses.findIndex((m) => m.anio === d.getUTCFullYear() && m.mes === d.getUTCMonth());
  }

  for (const f of facturas) {
    const idx = indiceDeMes(f.fechaEmision);
    if (idx >= 0) resultado[`${f.empresa.slug}Facturado`][idx] += Number(f.montoTotal);
  }
  for (const g of gastos) {
    const idx = indiceDeMes(g.fecha);
    if (idx >= 0) resultado[`${g.empresa.slug}Gastado`][idx] += Number(g.monto);
  }

  return resultado;
}
