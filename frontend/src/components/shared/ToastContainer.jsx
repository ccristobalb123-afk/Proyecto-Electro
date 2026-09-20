import { IconCheckCircle, IconAlertCircle, IconInfo, IconClose } from "../icons/Icons";
import "./ToastContainer.css";

export default function ToastContainer({ toasts, onCerrar }) {
  // El contenedor se monta siempre (vacío mide 0 de alto y no captura clics):
  // una región aria-live debe existir antes de que llegue el mensaje para que
  // los lectores de pantalla lo anuncien.
  return (
    <div className="toast-container" role="status" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tipo || "info"}`}>
          <div className="toast__icono-wrapper">
            {t.tipo === "success" && <IconCheckCircle width={18} height={18} className="toast-icon--success" />}
            {t.tipo === "error" && <IconAlertCircle width={18} height={18} className="toast-icon--error" />}
            {(t.tipo === "info" || !t.tipo) && <IconInfo width={18} height={18} className="toast-icon--info" />}
          </div>

          <span className="toast__mensaje">{t.mensaje}</span>

          <div className="toast__acciones">
            {t.accionTexto && (
              <button
                className="toast__deshacer"
                onClick={() => {
                  t.onAccion?.();
                  onCerrar(t.id);
                }}
              >
                {t.accionTexto}
              </button>
            )}
            <button className="toast__cerrar" onClick={() => onCerrar(t.id)} aria-label="Cerrar">
              <IconClose width={14} height={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
