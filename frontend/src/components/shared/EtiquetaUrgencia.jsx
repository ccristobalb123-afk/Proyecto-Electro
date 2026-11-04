import "./EtiquetaUrgencia.css";

// Urgencia de un aviso de vencimiento — texto, no solo color. La
// severidad la decide el backend (lib/mensajesAlerta.js).
const enDias = (n) => `${n} ${n === 1 ? "día" : "días"}`;

function texto({ severidad, dias }) {
  if (severidad === "vencido") return `Vencido, hace ${enDias(-dias)}`;
  if (severidad === "hoy") return "Vence hoy";
  return `En ${enDias(dias)}`;
}

// `className`: ajustes de quien la usa (ej. el margen en celular de las filas
// del Dashboard), con clases de Tailwind.
export default function EtiquetaUrgencia({ aviso, className = "" }) {
  return (
    <span className={`etiqueta-urgencia etiqueta-urgencia--${aviso.severidad}${className ? ` ${className}` : ""}`}>
      <i aria-hidden="true" />
      {texto(aviso)}
    </span>
  );
}
