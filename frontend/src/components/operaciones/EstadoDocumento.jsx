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

// Píldora con punto de color. "Sin fecha" (falta un dato) va con borde
// punteado, para leerse como "pendiente".
const ESTADO = "inline-flex items-center gap-[5px] whitespace-nowrap rounded-[999px] px-[9px] py-[3px] text-xs font-semibold";
const COLOR = {
  vigente: "bg-success-tint text-success-dark",
  porvencer: "bg-volt-tint text-volt-dark",
  vencido: "bg-danger-tint text-danger-dark",
  sinfecha: "[border:1px_dashed_var(--border-control)] [background:var(--card)] text-gray-dark",
  novence: "bg-electro-tint text-electro-dark",
};
const PUNTO = "size-1.5 rounded-[50%] bg-current";

function detalle({ estado, dias }) {
  if (estado === "porvencer") return dias === 0 ? "vence hoy" : `en ${dias} ${dias === 1 ? "día" : "días"}`;
  if (estado === "vencido") return `hace ${-dias} ${dias === -1 ? "día" : "días"}`;
  return null;
}

export default function EstadoDocumento({ documento }) {
  const extra = detalle(documento);
  return (
    <span className={`${ESTADO} ${COLOR[documento.estado]}`}>
      <i className={PUNTO} aria-hidden="true" />
      {ETIQUETA[documento.estado]}
      {extra && <span className="font-medium"> · {extra}</span>}
    </span>
  );
}

