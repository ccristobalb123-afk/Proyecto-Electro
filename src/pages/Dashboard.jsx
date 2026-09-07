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

// TODO backend: GET /api/finanzas/comparativo — suma de Factura (facturado)
// y Gasto (gastado) agrupada por empresa y por mes, de los últimos meses.
const comparativoMeses = {
  labels: ["Mar 2026", "Abr 2026", "May 2026", "Jun 2026", "Jul 2026", "Ago 2026"],
  corevexFacturado: [17200, 18900, 19800, 21400, 24600, 27200],
  corevexGastado: [12800, 13400, 14100, 14900, 13600, 15900],
  electroFacturado: [15600, 16800, 17900, 19100, 21300, 23800],
  electroGastado: [13900, 14200, 14700, 15100, 15000, 16600],
};

function useComparativoChart(canvasRef, mesFinalIndex) {
  const chartRef = useRef(null);

  function ventana() {
    const fin = mesFinalIndex;
    const inicio = Math.max(0, fin - 2);
    return {
      labels: comparativoMeses.labels.slice(inicio, fin + 1),
      corevexFacturado: comparativoMeses.corevexFacturado.slice(inicio, fin + 1),
      corevexGastado: comparativoMeses.corevexGastado.slice(inicio, fin + 1),
      electroFacturado: comparativoMeses.electroFacturado.slice(inicio, fin + 1),
      electroGastado: comparativoMeses.electroGastado.slice(inicio, fin + 1),
    };
  }

  // Crea el gráfico UNA sola vez al montar, y lo destruye al desmontar.
  // Separar creación/destrucción de la actualización de datos evita el
  // bug clásico de Chart.js + React StrictMode: en desarrollo, React
  // monta-desmonta-monta cada componente para detectar efectos mal
  // limpiados; si la referencia al gráfico queda "viva" tras destruirlo,
  // la siguiente actualización se hace sobre un gráfico ya destruido y
  // React truena en silencio (pantalla en blanco, sin aviso claro).
  useEffect(() => {
    if (!canvasRef.current) return;
    const d = ventana();

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: d.labels,
        datasets: [
          {
            label: "CorevexSAC — Facturado",
            data: d.corevexFacturado,
            borderColor: "#2563eb",
            backgroundColor: "#2563eb",
            tension: 0.35,
            pointRadius: 4,
            borderWidth: 2,
          },
          {
            label: "CorevexSAC — Gastado",
            data: d.corevexGastado,
            borderColor: "#2563eb",
            backgroundColor: "#2563eb",
            borderDash: [5, 4],
            tension: 0.35,
            pointRadius: 4,
            borderWidth: 2,
          },
          {
            label: "ElectroSAC — Facturado",
            data: d.electroFacturado,
            borderColor: "#64748b",
            backgroundColor: "#64748b",
            tension: 0.35,
            pointRadius: 4,
            borderWidth: 2,
          },
          {
            label: "ElectroSAC — Gastado",
            data: d.electroGastado,
            borderColor: "#64748b",
            backgroundColor: "#64748b",
            borderDash: [5, 4],
            tension: 0.35,
            pointRadius: 4,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { color: "#667085", font: { family: "Inter", size: 11.5 }, boxWidth: 14, padding: 14 },
          },
        },
        scales: {
          y: {
            ticks: {
              callback: (v) => "S/ " + v / 1000 + "k",
              font: { family: "JetBrains Mono", size: 11 },
              color: "#667085",
            },
            // Sin líneas horizontales — solo los números del eje quedan
            // como referencia, el fondo del panel ya está limpio.
            grid: { display: false },
            border: { display: false },
          },
          x: {
            ticks: { font: { family: "Inter", size: 12, weight: 500 }, color: "#1f2937" },
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

  // Solo actualiza los datos cuando cambia el mes final elegido — no
  // recrea el gráfico entero.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const d = ventana();
    chart.data.labels = d.labels;
    chart.data.datasets[0].data = d.corevexFacturado;
    chart.data.datasets[1].data = d.corevexGastado;
    chart.data.datasets[2].data = d.electroFacturado;
    chart.data.datasets[3].data = d.electroGastado;
    chart.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesFinalIndex]);
}

export default function Dashboard() {
  const chartRef = useRef(null);
  // Índice del último mes de la ventana de 3 meses que se muestra —
  // arranca en el más reciente (Ago 2026, el último de comparativoMeses).
  const [mesFinalIndex, setMesFinalIndex] = useState(comparativoMeses.labels.length - 1);
  useComparativoChart(chartRef, mesFinalIndex);

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
          <h3>Facturado vs. gastado por empresa</h3>
          <select
            className="month-select"
            value={mesFinalIndex}
            onChange={(e) => setMesFinalIndex(Number(e.target.value))}
          >
            {comparativoMeses.labels.map((label, i) =>
              i >= 2 ? (
                <option key={label} value={i}>
                  Hasta {label}
                </option>
              ) : null
            )}
          </select>
        </div>
        <div className="panel-chart">
          <canvas ref={chartRef} height="100" />
        </div>
      </div>
    </AppShell>
  );
}
