import "./Lightbox.css";
import { IconClose } from "../icons/Icons";

// Visor de imagen a pantalla casi completa. Deliberadamente separado del
// Modal genérico: Modal tiene un ancho fijo pensado para formularios
// (460/560px), y acá queremos aprovechar casi toda la pantalla para ver
// la foto con detalle.
export default function Lightbox({ src, alt, onClose }) {
  if (!src) return null;
  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" type="button" onClick={onClose} title="Cerrar">
        <IconClose width={18} height={18} />
      </button>
      <img className="lightbox-img" src={src} alt={alt || ""} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
