import { IconLoader } from "../icons/Icons";
import "./Loading.css";

/**
 * Pantalla/bloque de carga reutilizable.
 * Úsalo mientras se espera la respuesta del backend (ej. al listar equipos, facturas, etc.)
 */
export default function Loading({ texto = "Cargando..." }) {
  return (
    <div className="loading-bloque">
      <IconLoader className="loading-spinner-icon" width={30} height={30} />
      <p className="loading-texto">{texto}</p>
    </div>
  );
}
