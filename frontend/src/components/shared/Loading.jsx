import { Spinner } from "./Carga";
import "./Loading.css";

/**
 * Bloque de carga para listas y pantallas (al entrar a una sección, al
 * cambiar de pestaña, empresa o filtro). role="status": el lector de
 * pantalla anuncia "Cargando información…" sin interrumpir.
 */
export default function Loading({ texto = "Cargando información…" }) {
  return (
    <div className="loading-bloque" role="status" aria-live="polite">
      <Spinner tamano={30} className="loading-spinner-icon" />
      <p className="loading-texto">{texto}</p>
    </div>
  );
}
