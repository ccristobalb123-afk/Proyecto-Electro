import "./EtiquetaUrgencia.css";

// Urgencia de un aviso de vencimiento — texto, no solo color. La
// severidad la decide el backend (lib/mensajesAlerta.js).
function texto({ severidad, dias }) {
  if (severidad === "vencido") return "Vencido";
  if (severidad === "hoy") return "Vence hoy";
  return `En ${dias} ${dias === 1 ? "día" : "días"}`;
}

export default function EtiquetaUrgencia({ aviso }) {
  return (
    <span className={`etiqueta-urgencia etiqueta-urgencia--${aviso.severidad}`}>
      <i aria-hidden="true" />
      {texto(aviso)}
    </span>
  );
}
