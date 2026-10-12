// Estado de un documento de vehículo — siempre con texto, no solo color.
// El cálculo (con los días de anticipación de ESE documento) lo hace el
// backend; acá solo se muestra.
const ETIQUETA = {
  vigente: "Vigente",
  porvencer: "Por vencer",
  vencido: "Vencido",
  sinfecha: "Sin fecha",
  novence: "No vence",
};

function detalle({ estado, dias }) {
  if (estado === "porvencer") return dias === 0 ? "vence hoy" : `en ${dias} ${dias === 1 ? "día" : "días"}`;
  if (estado === "vencido") return `hace ${-dias} ${dias === -1 ? "día" : "días"}`;
  return null;
}

export default function EstadoDocumento({ documento }) {
  const extra = detalle(documento);
  return (
    <span className={`doc-estado doc-estado--${documento.estado}`}>
      <i aria-hidden="true" />
      {ETIQUETA[documento.estado]}
      {extra && <span className="doc-estado__detalle"> · {extra}</span>}
    </span>
  );
}

