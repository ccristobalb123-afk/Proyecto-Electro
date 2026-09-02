import { IconAlertCircle, IconHelpCircle } from "../icons/Icons";
import "./ConfirmDialog.css";

export default function ConfirmDialog({ mensaje, tipo = "normal", onConfirmar, onCancelar }) {
  return (
    <div className="confirm-overlay" onClick={onCancelar}>
      <div
        className={`confirm-card ${tipo === "peligro" ? "confirm-card--peligro" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-icono-container">
          {tipo === "peligro" ? (
            <IconAlertCircle className="confirm-icono confirm-icono--peligro" width={26} height={26} />
          ) : (
            <IconHelpCircle className="confirm-icono confirm-icono--normal" width={26} height={26} />
          )}
        </div>

        <p className="confirm-mensaje">{mensaje}</p>

        <div className="confirm-acciones">
          <button className="btn-confirm-secondary" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            className={tipo === "peligro" ? "btn-confirm-danger" : "btn-confirm-primary"}
            onClick={onConfirmar}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
