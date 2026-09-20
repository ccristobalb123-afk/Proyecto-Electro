import { db } from "../lib/db.js";
import { calcularEstadoPago, totalPagado } from "../lib/estadoPago.js";

function diasRestantes(fecha) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(fecha);
  objetivo.setHours(0, 0, 0, 0);
  return Math.round((objetivo - hoy) / (24 * 60 * 60 * 1000));
}

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
export async function obtenerKpis(empresasPermitidas) {
  const filtroEmpresa = { empresa: { slug: { in: empresasPermitidas } } };

  const [contratos, cursos, totalEquipos, disponibles, facturas] = await Promise.all([
    db.contrato.findMany({ where: { estadoManual: null, ...filtroEmpresa } }),
    db.curso.findMany({ where: { estadoManual: null, ...filtroEmpresa } }),
    db.equipo.count({ where: { estado: { not: "DEBAJA" }, ...filtroEmpresa } }),
    db.equipo.count({ where: { estado: "DISPONIBLE", ...filtroEmpresa } }),
    db.factura.findMany({ where: { anulada: false, ...filtroEmpresa }, include: { pagos: true } }),
  ]);

  const contratosPorVencer = contratos.filter((c) => {
    const dias = diasRestantes(c.fechaFin);
    return dias >= 0 && dias <= c.diasAnticipacion;
  }).length;

  const cursosPorVencer = cursos.filter((c) => {
    const dias = diasRestantes(c.fechaVencimiento);
    return dias >= 0 && dias <= c.diasAnticipacion;
  }).length;

  const documentosVehiculo = await db.documentoVehiculo.findMany({
    where: { fechaVencimiento: { not: null }, vehiculo: filtroEmpresaVehiculo(empresasPermitidas) },
  });
  const documentosPorVencer = documentosVehiculo.filter((d) => {
    const dias = diasRestantes(d.fechaVencimiento);
    return dias >= 0 && dias <= 45;
  }).length;

  const equiposConInspeccion = await db.equipo.findMany({
    where: { proximaInspeccion: { not: null }, estado: { not: "DEBAJA" }, ...filtroEmpresa },
    select: { proximaInspeccion: true },
  });
  // Antes esto contaba TODOS los equipos con una fecha de próxima
  // inspección, sin importar si faltaban 2 días o 3 años — no
  // coincidía con el criterio real de "por vencer" (dias <= 15) que sí
  // usa el panel de abajo y el push.
  const inspeccionesPorVencer = equiposConInspeccion.filter((eq) => {
    const dias = diasRestantes(eq.proximaInspeccion);
    return dias >= 0 && dias <= 15;
  }).length;

  // Facturas por cobrar que ya entran en la ventana de aviso (30 días)
  // y no están pagadas del todo — mismo criterio que usa listarAlertas
  // más abajo. Antes faltaba acá, así que la campanita podía mostrar
  // más alertas que las que decía este número.
  const facturasPorVencer = facturas.filter((f) => {
    if (calcularEstadoPago(f.montoTotal, f.pagos) === "pagado") return false;
    return diasRestantes(f.fechaVencimiento) <= 30;
  }).length;

  const porCobrar = facturas.reduce((acc, f) => {
    const saldo = Number(f.montoTotal) - totalPagado(f.pagos);
    return acc + Math.max(0, saldo);
  }, 0);

  return {
    contratosPorVencer,
    equiposDisponibles: `${disponibles}/${totalEquipos}`,
    porCobrar,
    // Mismos 5 orígenes que muestra el panel de "Próximos vencimientos"
    // (listarAlertas) — antes faltaban las facturas acá, y el número
    // de este KPI podía no coincidir con lo que mostraba la campana.
    alertasPendientes: contratosPorVencer + cursosPorVencer + documentosPorVencer + inspeccionesPorVencer + facturasPorVencer,
  };
}

// ---- Panel de "Próximos vencimientos" ----
export async function listarAlertas({ limit = 5 } = {}, empresasPermitidas) {
  const alertas = [];
  const filtroEmpresa = { empresa: { slug: { in: empresasPermitidas } } };

  const contratos = await db.contrato.findMany({ where: { estadoManual: null, ...filtroEmpresa }, include: { personal: true, empresa: true } });
  for (const c of contratos) {
    const dias = diasRestantes(c.fechaFin);
    if (dias >= 0 && dias <= c.diasAnticipacion) {
      alertas.push({ id: `contrato-${c.id}`, tipo: "contrato", titulo: `Contrato — ${c.personal.nombre}`, empresa: c.empresa.nombre, dias });
    }
  }

  const cursos = await db.curso.findMany({ where: { estadoManual: null, ...filtroEmpresa }, include: { personal: true, empresa: true } });
  for (const c of cursos) {
    const dias = diasRestantes(c.fechaVencimiento);
    if (dias >= 0 && dias <= c.diasAnticipacion) {
      alertas.push({ id: `curso-${c.id}`, tipo: "curso", titulo: `${c.tipo} — ${c.personal.nombre}`, empresa: c.empresa.nombre, dias });
    }
  }

  const documentos = await db.documentoVehiculo.findMany({
    where: { fechaVencimiento: { not: null }, vehiculo: filtroEmpresaVehiculo(empresasPermitidas) },
    include: { vehiculo: { include: { empresaDuena: true } } },
  });
  for (const d of documentos) {
    const dias = diasRestantes(d.fechaVencimiento);
    if (dias >= 0 && dias <= 45) {
      alertas.push({ id: `vehiculo-${d.id}`, tipo: "vehiculo", titulo: `${d.tipo} — Vehículo ${d.vehiculo.placa}`, empresa: d.vehiculo.empresaDuena.nombre, dias });
    }
  }

  const equipos = await db.equipo.findMany({
    where: { proximaInspeccion: { not: null }, estado: { not: "DEBAJA" }, ...filtroEmpresa },
    include: { empresa: true },
  });
  for (const eq of equipos) {
    const dias = diasRestantes(eq.proximaInspeccion);
    if (dias >= 0 && dias <= 15) {
      alertas.push({ id: `equipo-${eq.id}`, tipo: "equipo", titulo: `Inspección — Equipo ${eq.codigo}`, empresa: eq.empresa.nombre, dias });
    }
  }

  const facturas = await db.factura.findMany({ where: { anulada: false, ...filtroEmpresa }, include: { pagos: true, empresa: true } });
  for (const f of facturas) {
    const estado = calcularEstadoPago(f.montoTotal, f.pagos);
    if (estado === "pagado") continue;
    const dias = diasRestantes(f.fechaVencimiento);
    if (dias <= 30) {
      alertas.push({ id: `factura-${f.id}`, tipo: "factura", titulo: `Factura #${f.serie}-${f.numero} por cobrar`, empresa: f.empresa.nombre, dias });
    }
  }

  alertas.sort((a, b) => a.dias - b.dias);
  return alertas.slice(0, limit);
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

  const inicio = new Date(meses[0].anio, meses[0].mes, 1);
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
    const d = new Date(fecha);
    return meses.findIndex((m) => m.anio === d.getFullYear() && m.mes === d.getMonth());
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
