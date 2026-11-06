import { IconCheckCircle, IconAlertCircle, IconInfo, IconClose } from "../icons/Icons";
import "./ToastContainer.css";

/* Estilos con Tailwind (ver docs/tailwind.md). "toast" y "toast--{tipo}"
   son ganchos: ToastContainer.css (con un modal abierto) y motion.css
   (solo fundido con movimiento reducido); toast__cerrar, de responsive.css
   (alto táctil de 44px). Las animaciones (@keyframes) siguen en
   ToastContainer.css.
   Celular (max-md:, ≤640px): arriba, justo debajo del topbar. Abajo
   tapaban la barra de "Guardar" de los modales (un toque en "Guardar"
   durante esos 5 s caía en el aviso); encima del topbar tapaban el botón "+". */
const CONTENEDOR = `fixed bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 z-(--z-toast) box-border flex w-full max-w-[440px]
  [transform:translateX(-50%)] flex-col-reverse items-center gap-2 px-4 py-0 pointer-events-none
  max-md:top-[calc(var(--topbar-height)+env(safe-area-inset-top)+8px)] max-md:bottom-auto max-md:flex-col`;
const TOAST = `toast flex w-full items-center gap-3 rounded-lg border border-ink-border [background:var(--ink)] px-3.5 py-2.5
  [box-shadow:0_12px_32px_-4px_rgba(0,0,0,0.35)] pointer-events-auto [will-change:transform,opacity]
  [animation:toast-aparecer_0.22s_var(--ease-out)] max-md:[animation-name:toast-aparecer-arriba]`;
const DESHACER = `cursor-pointer rounded-[4px] [background:none] px-1.5 py-1 font-body text-[13.5px] font-semibold text-volt [border:none]
  [transition:opacity_0.15s_ease] hover:opacity-80`;
const CERRAR = `toast__cerrar flex cursor-pointer items-center justify-center rounded-[4px] [background:none] p-1 text-on-ink-muted
  [border:none] [transition:background-color_0.12s_ease,color_0.12s_ease] hover:[background:rgba(255,255,255,0.06)] hover:text-on-ink`;

export default function ToastContainer({ toasts, onCerrar }) {
  // El contenedor se monta siempre (vacío mide 0 de alto y no captura clics).
  // La urgencia la declara cada toast: los errores interrumpen (role="alert",
  // asertivo) y el resto se anuncia sin interrumpir (role="status", cortés).
  // Así un error no espera a que el lector termine de hablar.
  return (
    // aria-live en el contenedor (que existe siempre): algunos lectores
    // de pantalla no anuncian una región role="status" recién insertada,
    // pero sí lo que aparece dentro de una región live que ya estaba.
    <div className={CONTENEDOR} aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${TOAST} toast--${t.tipo || "info"}`}
          role={t.tipo === "error" ? "alert" : "status"}
          aria-atomic="true"
        >
          <div className="flex shrink-0">
            {t.tipo === "success" && <IconCheckCircle width={18} height={18} className="text-success" />}
            {t.tipo === "error" && <IconAlertCircle width={18} height={18} className="text-danger" />}
            {(t.tipo === "info" || !t.tipo) && <IconInfo width={18} height={18} className="text-volt" />}
          </div>

          <span className="flex-1 text-[13.5px] leading-[1.4] font-medium text-on-ink">{t.mensaje}</span>

          <div className="flex shrink-0 items-center gap-3">
            {t.accionTexto && (
              <button
                className={DESHACER}
                onClick={() => {
                  t.onAccion?.();
                  onCerrar(t.id);
                }}
              >
                {t.accionTexto}
              </button>
            )}
            <button className={CERRAR} onClick={() => onCerrar(t.id)} aria-label="Cerrar">
              <IconClose width={14} height={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
