import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { AppShell, DefaultTopbarExtra } from "../components/layout/AppShell";
import {
  IconContrato,
  IconWrench,
  IconInvoice,
  IconTruck,
  IconBell,
  IconClipboardCheck,
} from "../components/icons/Icons";
import * as notificacionesService from "../services/notificacionesService";
import { useAsyncList } from "../hooks/useAsyncList";
import Loading from "../components/shared/Loading";
import EstadoVacio from "../components/shared/EstadoVacio";
import EstadoError from "../components/shared/EstadoError";
import "./Dashboard.css";

// TODO backend: reemplazar por GET /api/dashboard (KPIs de los 4 módulos,
// calculados en el servidor a partir de Contrato/Equipo/Factura/Alerta).
const kpis = [
  { label: "Contratos por vencer", value: "6", icon: IconContrato, tone: "copper" },
  { label: "Equipos disponibles", value: "18/24", icon: IconWrench, tone: "success" },
  { label: "Por cobrar (ambas empresas)", value: "S/ 24,8k", icon: IconInvoice, tone: "copper" },
  { label: "Alertas pendientes", value: "7", icon: IconBell, tone: "danger" },
];

const ICONO_POR_TIPO = {
  curso: IconClipboardCheck,
  contrato: IconContrato,
  equipo: IconWrench,
  vehiculo: IconTruck,
  factura: IconInvoice,
};

const TAG_POR_DIAS = (dias) => (dias <= 5 ? "red" : dias <= 15 ? "amber" : "gray");

// TODO backend: GET /api/finanzas/comparativo?mes=2026-08 — suma de
// DocumentoFinanciero/Gasto/Planilla agrupados por empresa, por mes.
// Un gráfico por mes (no un año completo) para que los montos no se
// vean chicos al compartir escala con 12 puntos.
const comparativoPorMes = {
  "2026-08": {
    label: "Ago 2026",
    labels: ["Por cobrar", "Por pagar", "Gastos", "Planilla"],
    corevex: [14200, 6800, 9100, 15300],
    electro: [10600, 9200, 7400, 18900],
  },
  "2026-07": {
    label: "Jul 2026",
    labels: ["Por cobrar", "Por pagar", "Gastos", "Planilla"],
    corevex: [11800, 5200, 8400, 15300],
    electro: [9200, 8100, 6900, 18900],
  },
  "2026-06": {
    label: "Jun 2026",
    labels: ["Por cobrar", "Por pagar", "Gastos", "Planilla"],
    corevex: [9600, 7100, 7800, 14800],
    electro: [12400, 6700, 8200, 18200],
  },
};

function useComparativoChart(canvasRef, mesInicial) {
  const chartRef = useRef(null);

  // Crea el gráfico UNA sola vez al montar, y lo destruye al desmontar.
  // Separar creación/destrucción de la actualización de datos evita el
  // bug clásico de Chart.js + React StrictMode: en desarrollo, React
  // monta-desmonta-monta cada componente para detectar efectos mal
  // limpiados; si la referencia al gráfico queda "viva" tras destruirlo,
  // la siguiente actualización se hace sobre un gráfico ya destruido y
  // React truena en silencio (pantalla en blanco, sin aviso claro).
  useEffect(() => {
    if (!canvasRef.current) return;
    const data = comparativoPorMes[mesInicial];

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "CorevexSAC",
            data: data.corevex,
            borderColor: "#C9752E",
            backgroundColor: "#C9752E",
            tension: 0.35,
            pointRadius: 4,
            borderWidth: 2,
          },
          {
            label: "ElectroSAC",
            data: data.electro,
            borderColor: "#3B6E8F",
            backgroundColor: "#3B6E8F",
            tension: 0.35,
            pointRadius: 4,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            ticks: {
              callback: (v) => "S/ " + v / 1000 + "k",
              font: { family: "JetBrains Mono", size: 11 },
              color: "#6B7280",
            },
            grid: { color: "#E4E0D6" },
          },
          x: {
            ticks: { font: { family: "Inter", size: 12, weight: 500 }, color: "#374151" },
            grid: { display: false },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null; // clave: sin esto, la próxima actualización apunta a un gráfico destruido
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef]);

  // Solo actualiza los datos cuando cambia el mes — no recrea el gráfico.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const data = comparativoPorMes[mesInicial];
    chart.data.datasets[0].data = data.corevex;
    chart.data.datasets[1].data = data.electro;
    chart.update();
  }, [mesInicial]);
}

export default function Dashboard() {
  const chartRef = useRef(null);
  const [mes, setMes] = useState("2026-08");
  useComparativoChart(chartRef, mes);

  const {
    data: proximosVencimientos,
    loading: cargandoAlertas,
    error: errorAlertas,
    reload: recargarAlertas,
  } = useAsyncList(() => notificacionesService.listarAlertas({ limit: 5 }), []);

  const { data: actividadReciente } = useAsyncList(() => notificacionesService.listarActividadReciente({ limit: 4 }), []);

  return (
    <AppShell
      title="Dashboard general"
      topbarExtra={<DefaultTopbarExtra />}
    >
      <div className="kpi-grid">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <div className="kpi-card" key={label}>
            <div className="kpi-top">
              <div className={`kpi-icon ${tone}`}>
                <Icon />
              </div>
            </div>
            <div className="kpi-num">{value}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="cols">
        <div className="panel">
          <div className="panel-head">
            <h3>Próximos vencimientos</h3>
            <span>Ver todos</span>
          </div>
          {cargandoAlertas ? (
            <Loading texto="Cargando..." />
          ) : errorAlertas ? (
            <EstadoError error={errorAlertas} onReintentar={recargarAlertas} mensaje="No se pudieron cargar los vencimientos." />
          ) : proximosVencimientos.length === 0 ? (
            <EstadoVacio titulo="No hay vencimientos próximos" descripcion="Todo al día." />
          ) : (
            proximosVencimientos.map(({ id, titulo, empresa, dias, tipo }) => {
              const Icon = ICONO_POR_TIPO[tipo] || IconBell;
              return (
                <div className="row-item" key={id}>
                  <div className="row-icon">
                    <Icon />
                  </div>
                  <div className="row-main">
                    <div className="row-title">{titulo}</div>
                    <div className="row-sub">
                      <span className="co-pill">{empresa}</span> vence en {dias} días
                    </div>
                  </div>
                  <span className={`tag ${TAG_POR_DIAS(dias)}`}>{dias}d</span>
                </div>
              );
            })
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Actividad reciente</h3>
          </div>
          {actividadReciente.map((item, i) => (
            <div className="act-item" key={i}>
              <div className="act-avatar">{item.iniciales}</div>
              <div>
                <div
                  className="act-text"
                  dangerouslySetInnerHTML={{ __html: item.texto }}
                />
                <div className="act-time">{item.tiempo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Comparativo por empresa</h3>
          <select
            className="month-select"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          >
            {Object.entries(comparativoPorMes).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="panel-chart">
          <canvas ref={chartRef} height="90" />
          <div className="legend">
            <span>
              <i style={{ background: "var(--copper)" }} />
              CorevexSAC
            </span>
            <span>
              <i style={{ background: "var(--electro)" }} />
              ElectroSAC
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
