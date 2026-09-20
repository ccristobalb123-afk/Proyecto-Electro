import { useEffect, useId, useRef } from "react";
import { IconAlertCircle, IconHelpCircle } from "../icons/Icons";
import "./ConfirmDialog.css";

export default function ConfirmDialog({ mensaje, tipo = "normal", soloInformativo = false, onConfirmar, onCancelar }) {
  const mensajeId = useId();
  const cardRef = useRef(null);

  useEffect(() => {
    const disparador = document.activeElement;
    cardRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") onCancelar();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      disparador?.focus?.();
    };
  }, [onCancelar]);

  return (
    <div className="confirm-overlay" onClick={onCancelar}>
      <div
        ref={cardRef}
        role="alertdialog"
        aria-modal="true"
        aria-describedby={mensajeId}
        tabIndex={-1}
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

        <p id={mensajeId} className="confirm-mensaje">{mensaje}</p>

        <div className="confirm-acciones">
          {!soloInformativo && (
            <button className="btn-confirm-secondary" type="button" onClick={onCancelar}>
              Cancelar
            </button>
          )}
          <button
            className={tipo === "peligro" ? "btn-confirm-danger" : "btn-confirm-primary"}
            type="button"
            onClick={onConfirmar}
          >
            {soloInformativo ? "Entendido" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
