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
import EtiquetaUrgencia from "../components/shared/EtiquetaUrgencia";
import { Link } from "react-router-dom";
import "./Dashboard.css";

const ICONO_KPI = [IconContrato, IconWrench, IconInvoice, IconBell];
// "Contratos por vencer" en ámbar: es un aviso (por vencer), no una acción.
const TONE_KPI = ["volt", "success", "copper", "danger"];

/* Estilos con Tailwind (ver docs/tailwind.md). Las clases sin estilo propio
   que quedan son ganchos de reglas sin capa que siguen en otros archivos:
   - kpi-grid, cols: columnas en tablet/celular (responsive.css);
   - kpi-card, panel: color del borde suave (tarjetas.css; acá solo el ancho);
   - month-select: alto táctil de 44px (responsive.css);
   - panel-head__accion, panel-chart-cargando: Dashboard.css (lo que fijan
     .link-button y Loading.css, reglas sin capa, en esos elementos).
   [background:…] y [box-shadow:…] en vez de bg-… / shadow-…: copian el
   "background:" abreviado y la sombra de antes, para que el estilo calculado
   quede igual. max-md: = celular (≤640px), max-lg: = tablet (≤960px). */
const KPI_CARD = `kpi-card rounded-lg border bg-card p-[18px] [box-shadow:var(--shadow-sm)]
  max-md:grid max-md:grid-cols-[auto_minmax(0,1fr)] max-md:items-center max-md:gap-x-2 max-md:p-3`;
const KPI_ICONO = `flex size-[34px] items-center justify-center rounded *:size-[18px]
  max-md:size-7 max-md:*:size-4`;
const KPI_TONO = {
  copper: "[background:var(--copper-tint)] text-copper-dark",
  volt: "[background:var(--volt-tint)] text-volt-dark",
  danger: "[background:var(--danger-tint)] text-danger-dark",
  success: "[background:var(--success-tint)] text-success-dark",
};
const PANEL = "panel overflow-hidden rounded-lg border bg-card [box-shadow:var(--shadow-sm)]";
const PANEL_HEAD = `flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-b-border px-5 py-4
  max-md:px-4 max-md:py-3`;
const PANEL_TITULO = "text-[14.5px] font-semibold";
// Avisos de vencimiento: toda la fila lleva al registro. En celular la
// etiqueta baja debajo del texto, alineada con él (ml-11 = ícono de 32px +
// separación de 12px), para que título y detalle usen todo el ancho.
const FILA = `flex items-center gap-3 border-b border-b-border px-5 py-[13px] last:[border-bottom:none]
  hover:[background:var(--gray-tint)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-copper
  max-md:flex-wrap max-md:items-start max-md:gap-y-2 max-md:px-4 max-md:py-3`;
const ACTIVIDAD = "flex gap-2.5 border-b border-b-border px-5 py-[13px] last:[border-bottom:none]";

function soles(monto) {
  // Antes solo había "k": 557 millones se mostraban como "S/ 557682.1k".
  if (monto >= 1_000_000) return `S/ ${(monto / 1_000_000).toFixed(1)}M`;
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
  facturaPagar: IconInvoice,
};

// Cuántos avisos se ven en el panel antes de "Ver todos".
const AVISOS_VISIBLES = 5;

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
  const { data: comparativo, loading: cargandoComparativo } = useAsync(() => notificacionesService.obtenerComparativo(), []);

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
  } = useAsyncList(() => notificacionesService.listarAlertas(), []);
  const [verTodos, setVerTodos] = useState(false);
  const avisosVisibles = verTodos ? proximosVencimientos : proximosVencimientos.slice(0, AVISOS_VISIBLES);

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
        <div className="kpi-grid mb-6 grid grid-cols-[repeat(4,1fr)] gap-4">
          {cargandoKpis ? (
            <Loading texto="Cargando indicadores…" />
          ) : (
            kpis.map(({ label, value }, i) => {
              const Icon = ICONO_KPI[i];
              return (
                <div className={KPI_CARD} key={label}>
                  <div className="mb-3.5 flex items-center justify-between max-md:mb-0">
                    <div className={`${KPI_ICONO} ${KPI_TONO[TONE_KPI[i]]}`}>
                      <Icon />
                    </div>
                  </div>
                  <div className="mb-0.5 font-mono text-[26px] font-semibold max-md:mb-0 max-md:text-xl max-md:wrap-anywhere">
                    {value}
                  </div>
                  <div className="text-sm text-muted max-md:col-span-full max-md:mt-1 max-md:leading-[1.35]">{label}</div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="cols mb-6 grid grid-cols-[1.5fr_1fr] gap-5">
        <div className={PANEL}>
          <div className={PANEL_HEAD}>
            <h2 className={PANEL_TITULO}>Vencimientos</h2>
            {proximosVencimientos.length > AVISOS_VISIBLES && (
              <button className="link-button panel-head__accion" type="button" onClick={() => setVerTodos((v) => !v)} aria-expanded={verTodos}>
                {verTodos ? "Ver menos" : `Ver todos (${proximosVencimientos.length})`}
              </button>
            )}
          </div>
          {cargandoAlertas ? (
            <Loading texto="Cargando vencimientos…" />
          ) : errorAlertas ? (
            <EstadoError error={errorAlertas} onReintentar={recargarAlertas} mensaje="No se pudieron cargar los vencimientos." />
          ) : proximosVencimientos.length === 0 ? (
            <EstadoVacio titulo="Sin documentos por vencer" descripcion="No hay nada vencido ni por vencer. Todo al día." />
          ) : (
            avisosVisibles.map((aviso) => {
              const Icon = ICONO_POR_TIPO[aviso.tipo] || IconBell;
              return (
                <Link className={FILA} key={aviso.id} to={aviso.url}>
                  <div className="flex size-8 flex-none items-center justify-center rounded [background:var(--paper)] *:size-4 *:text-copper-dark">
                    <Icon />
                  </div>
                  <div className="min-w-0 flex-1 max-md:basis-[calc(100%-44px)]">
                    {/* Título y cuerpo completos (nombre del documento incluido):
                        pueden ocupar más de una línea en vez de cortarse con "…". */}
                    <div className="overflow-hidden text-base font-medium text-ellipsis whitespace-normal wrap-anywhere">
                      {aviso.titulo}
                    </div>
                    {/* Mismo texto que el push y la campana */}
                    <div className="mt-0.5 block items-center gap-1.5 text-xs leading-[1.4] text-muted wrap-anywhere">
                      {aviso.cuerpo}
                    </div>
                  </div>
                  <EtiquetaUrgencia aviso={aviso} className="max-md:ml-11" />
                </Link>
              );
            })
          )}
        </div>

        <div className={PANEL}>
          <div className={PANEL_HEAD}>
            <h2 className={PANEL_TITULO}>Actividad reciente</h2>
          </div>
          {actividadReciente.map((item, i) => (
            <div className={ACTIVIDAD} key={`${item.actor}-${item.detalle}-${i}`}>
              <div className="flex size-[26px] flex-none items-center justify-center rounded-[50%] [background:var(--paper)] text-xs font-semibold text-muted">
                {item.iniciales}
              </div>
              <div>
                <div className="text-sm leading-[1.5]">
                  <b className="font-semibold">{item.actor}</b> {item.accion} {item.detalle}
                </div>
                <div className="mt-0.5 text-xs text-muted-2">{item.tiempo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={PANEL}>
        <div className={PANEL_HEAD}>
          <h2 className={PANEL_TITULO}>Facturado vs. gastado por empresa</h2>
          {comparativo && (
            <select
              className="month-select h-8 rounded-[6px] border border-control [background:var(--card)] px-2.5 py-0 font-body text-sm text-muted"
              aria-label="Mes final del gráfico comparativo"
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
        {/* Alto fijo (no una proporción ancho/alto): el canvas de Chart.js usa
            maintainAspectRatio: false (useComparativoChart.js) y toma su tamaño
            de este contenedor. Sin un alto propio, el canvas no tiene de qué
            medirse y en algunos casos dejaba un hueco debajo del gráfico. En
            celular 300px: con menos, la leyenda (4 series, una por fila) no
            entraba y Chart.js cortaba la última. */}
        <div className="relative h-[320px] px-5 py-[18px] max-lg:h-[260px] max-md:h-[300px]">
          {/* Sin esto, el lienzo quedaba en blanco hasta que llegaban los datos */}
          {cargandoComparativo && (
            <div className="panel-chart-cargando absolute inset-0 flex items-center justify-center [background:var(--card)]">
              <Loading texto="Cargando gráfico…" />
            </div>
          )}
          {/* Mismo tamaño que fijará Chart.js al cargar: evita un salto de
              diseño mientras el chunk de Chart.js todavía se descarga. */}
          <canvas
            className="h-full w-full"
            ref={chartRef}
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
