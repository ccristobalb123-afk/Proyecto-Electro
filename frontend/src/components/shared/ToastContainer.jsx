import { IconCheckCircle, IconAlertCircle, IconInfo, IconClose } from "../icons/Icons";
import "./ToastContainer.css";

export default function ToastContainer({ toasts, onCerrar }) {
  // El contenedor se monta siempre (vacío mide 0 de alto y no captura clics).
  // La urgencia la declara cada toast: los errores interrumpen (role="alert",
  // asertivo) y el resto se anuncia sin interrumpir (role="status", cortés).
  // Así un error no espera a que el lector termine de hablar.
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.tipo || "info"}`}
          role={t.tipo === "error" ? "alert" : "status"}
          aria-atomic="true"
        >
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
