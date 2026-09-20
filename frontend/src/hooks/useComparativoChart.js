import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

// Gráfico de línea de facturado/gastado por empresa del Dashboard — se
// separó a su propio hook porque la configuración de Chart.js (colores,
// escalas, leyenda) es larga y no tiene nada que ver con el resto de la
// página; Dashboard.jsx solo necesita el <canvas ref>, el mes elegido y
// los datos ya traídos del backend (ver dashboardService.obtenerComparativo).
export function useComparativoChart(canvasRef, mesFinalIndex, datos) {
  const chartRef = useRef(null);

  // Muestra el mes elegido y los 2 anteriores, para que la línea
  // realmente tenga una tendencia que mirar — un solo punto no dice
  // nada. El selector de mes decide en qué mes termina esa ventana.
  function ventana() {
    if (!datos) return null;
    const fin = mesFinalIndex;
    const inicio = Math.max(0, fin - 2);
    return {
      labels: datos.labels.slice(inicio, fin + 1),
      corevexFacturado: (datos.corevexFacturado || []).slice(inicio, fin + 1),
      corevexGastado: (datos.corevexGastado || []).slice(inicio, fin + 1),
      electroFacturado: (datos.electroFacturado || []).slice(inicio, fin + 1),
      electroGastado: (datos.electroGastado || []).slice(inicio, fin + 1),
    };
  }

  // Crea el gráfico UNA sola vez que llegan los datos, y lo destruye al
  // desmontar. Separar creación/destrucción de la actualización evita
  // el bug clásico de Chart.js + React StrictMode: en desarrollo, React
  // monta-desmonta-monta cada componente para detectar efectos mal
  // limpiados; si la referencia al gráfico queda "viva" tras destruirlo,
  // la siguiente actualización se hace sobre un gráfico ya destruido y
  // React truena en silencio (pantalla en blanco, sin aviso claro).
  useEffect(() => {
    if (!canvasRef.current || !datos) return;
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
  }, [canvasRef, !!datos]);

  // Solo actualiza los datos cuando cambia el mes elegido (o llegan
  // datos nuevos) — no recrea el gráfico entero.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !datos) return;
    const d = ventana();
    chart.data.labels = d.labels;
    chart.data.datasets[0].data = d.corevexFacturado;
    chart.data.datasets[1].data = d.corevexGastado;
    chart.data.datasets[2].data = d.electroFacturado;
    chart.data.datasets[3].data = d.electroGastado;
    chart.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesFinalIndex, datos]);
}
