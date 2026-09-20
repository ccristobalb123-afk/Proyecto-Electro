import { useEffect, useRef, useState } from "react";
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
import { useAsync } from "../hooks/useAsync";
import { useComparativoChart } from "../hooks/useComparativoChart";
import Loading from "../components/shared/Loading";
import EstadoVacio from "../components/shared/EstadoVacio";
import EstadoError from "../components/shared/EstadoError";
import "./Dashboard.css";

const ICONO_KPI = [IconContrato, IconWrench, IconInvoice, IconBell];
const TONE_KPI = ["copper", "success", "copper", "danger"];

function soles(monto) {
  if (monto >= 1000) return `S/ ${(monto / 1000).toFixed(1)}k`;
  return `S/ ${monto.toFixed(0)}`;
}

// Texto equivalente del gráfico para lectores de pantalla: los mismos meses
// y montos que dibuja la ventana de 3 meses de useComparativoChart.
function resumenComparativo(datos, fin) {
  const inicio = Math.max(0, fin - 2);
  return datos.labels
    .slice(inicio, fin + 1)
    .map((mes, i) => {
      const monto = (serie) => soles(datos[serie]?.[inicio + i] ?? 0);
      return (
        `${mes}: CorevexSAC facturó ${monto("corevexFacturado")} y gastó ${monto("corevexGastado")}; ` +
        `ElectroSAC facturó ${monto("electroFacturado")} y gastó ${monto("electroGastado")}.`
      );
    })
    .join(" ");
}

const ICONO_POR_TIPO = {
  curso: IconClipboardCheck,
  contrato: IconContrato,
  equipo: IconWrench,
  vehiculo: IconTruck,
  factura: IconInvoice,
};

const TAG_POR_DIAS = (dias) => (dias <= 5 ? "red" : dias <= 15 ? "amber" : "gray");

export default function Dashboard() {
  const chartRef = useRef(null);

  // KPIs y el comparativo no son listas — se traen con useAsync (el
  // hermano de useAsyncList para un solo objeto), que ya trae
  // loading/error/reload en vez de un useEffect suelto sin manejo de
  // fallas (antes, si la API caía, las tarjetas quedaban vacías sin
  // explicarle nada al usuario).
  const { data: kpisData, loading: cargandoKpis, error: errorKpis, reload: recargarKpis } = useAsync(
    () => notificacionesService.obtenerKpis(),
    []
  );
  const { data: comparativo } = useAsync(() => notificacionesService.obtenerComparativo(), []);

  // Mes en el que termina la ventana de 3 meses que se muestra —
  // arranca en el más reciente en cuanto llega el comparativo.
  const [mesFinalIndex, setMesFinalIndex] = useState(null);
  useEffect(() => {
    if (comparativo && mesFinalIndex === null) {
      setMesFinalIndex(comparativo.labels.length - 1);
    }
  }, [comparativo, mesFinalIndex]);
  useComparativoChart(chartRef, mesFinalIndex ?? 0, comparativo);

  const {
    data: proximosVencimientos,
    loading: cargandoAlertas,
    error: errorAlertas,
    reload: recargarAlertas,
  } = useAsyncList(() => notificacionesService.listarAlertas({ limit: 5 }), []);

  const { data: actividadReciente } = useAsyncList(() => notificacionesService.listarActividadReciente({ limit: 4 }), []);

  const kpis = kpisData
    ? [
        { label: "Contratos por vencer", value: String(kpisData.contratosPorVencer) },
        { label: "Equipos disponibles", value: kpisData.equiposDisponibles },
        { label: "Por cobrar (ambas empresas)", value: soles(kpisData.porCobrar) },
        { label: "Alertas pendientes", value: String(kpisData.alertasPendientes) },
      ]
    : [];

  return (
    <AppShell
      title="Dashboard general"
      topbarExtra={<DefaultTopbarExtra />}
    >
      {errorKpis ? (
        <EstadoError error={errorKpis} onReintentar={recargarKpis} mensaje="No se pudieron cargar los indicadores." />
      ) : (
        <div className="kpi-grid">
          {cargandoKpis ? (
            <Loading texto="Cargando indicadores..." />
          ) : (
            kpis.map(({ label, value }, i) => {
              const Icon = ICONO_KPI[i];
              return (
                <div className="kpi-card" key={label}>
                  <div className="kpi-top">
                    <div className={`kpi-icon ${TONE_KPI[i]}`}>
                      <Icon />
                    </div>
                  </div>
                  <div className="kpi-num">{value}</div>
                  <div className="kpi-label">{label}</div>
                </div>
              );
            })
          )}
        </div>
      )}

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
            <div className="act-item" key={`${item.actor}-${item.detalle}-${i}`}>
              <div className="act-avatar">{item.iniciales}</div>
              <div>
                <div className="act-text">
                  <b>{item.actor}</b> {item.accion} {item.detalle}
                </div>
                <div className="act-time">{item.tiempo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Facturado vs. gastado por empresa</h3>
          {comparativo && (
            <select
              className="month-select"
              value={mesFinalIndex ?? comparativo.labels.length - 1}
              onChange={(e) => setMesFinalIndex(Number(e.target.value))}
            >
              {comparativo.labels.map((label, i) =>
                i >= 2 ? (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ) : null
              )}
            </select>
          )}
        </div>
        <div className="panel-chart">
          <canvas
            ref={chartRef}
            height="100"
            role="img"
            aria-label="Gráfico de líneas: facturado y gastado por empresa"
            aria-describedby="comparativo-resumen"
          />
          {comparativo && (
            <p id="comparativo-resumen" className="sr-only">
              {resumenComparativo(comparativo, mesFinalIndex ?? comparativo.labels.length - 1)}
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
