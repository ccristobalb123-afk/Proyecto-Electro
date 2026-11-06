import { useEffect } from "react";
import { IconClose } from "../icons/Icons";
import { useBloquearScroll } from "../../hooks/useBloquearScroll";

// Visor de imagen a pantalla casi completa. Deliberadamente separado del
// Modal genérico: Modal tiene un ancho fijo pensado para formularios
// (460/560px), y acá queremos aprovechar casi toda la pantalla para ver
// la foto con detalle.
// "lightbox-close" queda como gancho: responsive.css (44px táctiles).
const FONDO = "fixed inset-0 z-(--z-critical-alert) flex cursor-zoom-out items-center justify-center p-6 [background:rgba(15,19,24,0.85)]";
const CERRAR = `lightbox-close absolute top-5 right-6 flex h-[38px] w-[38px] items-center justify-center rounded-[50%] [border:none]
  [background:rgba(255,255,255,0.12)] text-on-accent hover:[background:rgba(255,255,255,0.22)]`;
const IMAGEN = "max-h-[90vh] max-w-[90vw] cursor-default rounded [box-shadow:var(--shadow-lg)] supports-[max-height:90dvh]:max-h-[90dvh]";

export default function Lightbox({ src, alt, onClose }) {
  useBloquearScroll(!!src);
  useEffect(() => {
    if (!src) return;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [src, onClose]);

  if (!src) return null;
  return (
    <div className={FONDO} onClick={onClose} role="dialog" aria-modal="true" aria-label="Foto ampliada">
      <button className={CERRAR} type="button" onClick={onClose} title="Cerrar" aria-label="Cerrar">
        <IconClose width={18} height={18} />
      </button>
      <img className={IMAGEN} src={src} alt={alt || ""} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
