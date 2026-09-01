import { IconClose } from "../icons/Icons";
import "./Modal.css";

export function Modal({ open, title, subtitle, onClose, children, wide }) {
  if (!open) return null;
  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div
        className={`modal ${wide ? "modal-wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 className="font-display">{title}</h2>
          <button className="modal-close" onClick={onClose} type="button">
            <IconClose width={16} height={16} />
          </button>
        </div>
        {subtitle && <p className="modal-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ onCancel, cancelLabel = "Cancelar", children }) {
  return (
    <div className="modal-actions">
      <button className="btn-secondary" type="button" onClick={onCancel}>
        {cancelLabel}
      </button>
      {children}
    </div>
  );
}

// Selector visual "CorevexSAC / ElectroSAC" reutilizado en todos los
// formularios que registran algo con empresa.
export function CompanyChoice({ value, onChange, name }) {
  return (
    <div className="co-choice">
      <label className={value === "corevex" ? "sel-corevex" : ""}>
        <input
          type="radio"
          name={name}
          checked={value === "corevex"}
          onChange={() => onChange("corevex")}
        />
        CorevexSAC
      </label>
      <label className={value === "electro" ? "sel-electro" : ""}>
        <input
          type="radio"
          name={name}
          checked={value === "electro"}
          onChange={() => onChange("electro")}
        />
        ElectroSAC
      </label>
    </div>
  );
}

// Campo "días de anticipación" destacado en amarillo/voltio — el mismo
// patrón en Contratos, Cursos, Equipos, Vehículos y Facturas: todo lo
// que tiene fecha de vencimiento pide cuántos días antes avisar.
export function AvisoVencimiento({ value, onChange, hint }) {
  return (
    <div className="aviso-field">
      <label>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        Aviso de vencimiento
      </label>
      <div className="aviso-input-row">
        <input
          type="number"
          min={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span>{hint || "días antes del vencimiento"}</span>
      </div>
    </div>
  );
}

// Historial tipo línea de tiempo — reutilizado en "Hoja de vida" de
// equipos/vehículos y en historiales de pago (Finanzas).
export function Timeline({ items }) {
  if (!items || items.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--muted-2)" }}>Aún no hay historial.</p>;
  }
  return (
    <div className="timeline">
      {items.map((item, i) => (
        <div className="tl-item" key={i}>
          <div className={`tl-dot ${item.tone || ""}`} />
          <div className="tl-body">
            <div className="tl-title">{item.titulo}</div>
            <div className="tl-meta">{item.fecha}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
