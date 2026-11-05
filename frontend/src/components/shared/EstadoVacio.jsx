import { IconInbox } from "../icons/Icons";

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
// Estilos con Tailwind (ver docs/tailwind.md).
export default function EstadoVacio({ titulo, descripcion, accionLabel, onAccion, icono: Icono = IconInbox }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center text-muted">
      <div className="mb-3.5 flex size-13 items-center justify-center rounded-[50%] bg-paper text-muted-2">
        <Icono width={26} height={26} />
      </div>
      <p className="m-0 mb-1 text-[14px] font-semibold text-text">{titulo}</p>
      {descripcion && <p className="m-0 max-w-[360px] text-[13px] text-muted">{descripcion}</p>}
      {accionLabel && onAccion && (
        <button className="btn-primary mt-3.5" type="button" onClick={onAccion}>
          {accionLabel}
        </button>
      )}
    </div>
  );
}
