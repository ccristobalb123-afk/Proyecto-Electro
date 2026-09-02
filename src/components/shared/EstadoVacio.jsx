import { IconInbox } from "../icons/Icons";
import "./EstadoVacio.css";

/**
 * Reemplaza una tabla o grilla en blanco por un mensaje que explica
 * qué pasó y qué hacer al respecto (punto 1.14 del roadmap).
 *
 * Uso:
 *   <EstadoVacio
 *     titulo="No hay facturas registradas"
 *     descripcion='Puedes registrar una nueva con el botón "Nueva factura".'
 *   />
 *
 * Con acción (además del texto, un botón que ya dispare la acción):
 *   <EstadoVacio titulo="..." accionLabel="Nuevo equipo" onAccion={abrirNuevo} />
 */
export default function EstadoVacio({ titulo, descripcion, accionLabel, onAccion, icono: Icono = IconInbox }) {
  return (
    <div className="estado-vacio">
      <div className="estado-vacio__icono">
        <Icono width={26} height={26} />
      </div>
      <p className="estado-vacio__titulo">{titulo}</p>
      {descripcion && <p className="estado-vacio__descripcion">{descripcion}</p>}
      {accionLabel && onAccion && (
        <button className="btn-primary" type="button" onClick={onAccion} style={{ marginTop: 14 }}>
          {accionLabel}
        </button>
      )}
    </div>
  );
}
