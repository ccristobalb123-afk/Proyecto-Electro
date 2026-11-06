// Urgencia de un aviso de vencimiento — texto, no solo color. La
// severidad la decide el backend (lib/mensajesAlerta.js).
const enDias = (n) => `${n} ${n === 1 ? "día" : "días"}`;

function texto({ severidad, dias }) {
  if (severidad === "vencido") return `Vencido, hace ${enDias(-dias)}`;
  if (severidad === "hoy") return "Vence hoy";
  return `En ${enDias(dias)}`;
}

// Estilos con Tailwind (ver docs/tailwind.md). "Vence hoy": rojo con borde,
// entre "por vencer" y "vencido".
const BASE = `inline-flex shrink-0 items-center gap-[5px] rounded-[999px] px-[9px] py-[3px] text-xs font-semibold whitespace-nowrap`;
const POR_SEVERIDAD = {
  vencido: "[background:var(--danger-tint)] text-danger-dark",
  hoy: "[background:var(--danger-tint)] text-danger-dark [box-shadow:inset_0_0_0_1px_var(--danger)]",
  porvencer: "[background:var(--volt-tint)] text-volt-dark",
};

// `className`: ajustes de quien la usa (ej. el margen en celular de las filas
// del Dashboard), con clases de Tailwind.
export default function EtiquetaUrgencia({ aviso, className = "" }) {
  return (
    <span className={`${BASE} ${POR_SEVERIDAD[aviso.severidad] || ""}${className ? ` ${className}` : ""}`}>
      <i className="h-1.5 w-1.5 rounded-[50%] [background:currentColor]" aria-hidden="true" />
      {texto(aviso)}
    </span>
  );
}
