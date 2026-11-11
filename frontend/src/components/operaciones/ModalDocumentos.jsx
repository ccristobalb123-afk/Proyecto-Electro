import { Modal, ModalActions } from "../shared/Modal";
import { IconFile, IconUpload } from "../icons/Icons";
import { BotonVerArchivo } from "../shared/VisorArchivo";
import { Spinner } from "../shared/Carga";
import EstadoDocumento from "./EstadoDocumento";
import { AYUDA_ARCHIVO } from "../../services/uploadsService";
import { fechaCorta } from "../../services/vehiculosService";
import { AYUDA, MENSAJE_VACIO } from "../shared/clasesModal";

// Una fila por documento, con línea debajo salvo la última.
const FILA = "flex items-center gap-3 border-b border-b-border py-[11px] last:[border-bottom:none]";
const ICONO = "flex size-8 flex-none items-center justify-center rounded bg-paper";
const PRINCIPAL = "min-w-0 flex-1";
const TITULO = "text-[13.5px] font-medium";
// Archivo: nombre (enlace), "Subiendo…" o "Sin archivo adjunto".
const ARCHIVO = "mt-0.5 text-xs";
// Enlace (BotonVerArchivo): letra y color con [&&]: para ganarle a las clases
// del botón. "docs-row-sub--link" queda como gancho: responsive.css
// (subrayado continuo y 44px táctiles en celular).
const ARCHIVO_ENLACE = "docs-row-sub--link [&&]:mt-0.5 [&&]:text-xs inline-block [&&]:text-link underline [&&]:hover:text-link-hover max-w-full truncate";
const ARCHIVO_SUBIENDO = `${ARCHIVO} flex items-center gap-1 text-muted tabular-nums`;
const ARCHIVO_PENDIENTE = `${ARCHIVO} text-danger-dark`;

// Una fila: nombre, estado, fechas, y ver / adjuntar / reemplazar archivo.
function FilaDocumento({ d, subiendo, onSubirArchivo }) {
  return (
    <div className={FILA}>
      <div className={ICONO}><IconFile className="size-4 text-accion-dark" width={16} height={16} /></div>
      <div className={PRINCIPAL}>
        <div className={TITULO}>{d.nombre}</div>
        {!d.legado && (
          <div className="mx-0 my-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted [font-variant-numeric:tabular-nums]">
            <EstadoDocumento documento={d} />
            <span>
              {d.fechaEmision && `Emitido ${fechaCorta(d.fechaEmision)} · `}
              {d.fechaVencimiento ? `Vence ${fechaCorta(d.fechaVencimiento)} · aviso ${d.diasAnticipacion} días antes` : d.estado === "novence" ? "Sin vencimiento" : "Falta el vencimiento"}
            </span>
          </div>
        )}
        {subiendo ? (
          <div className={ARCHIVO_SUBIENDO} role="status">
            <Spinner tamano={12} />
            {subiendo}
          </div>
        ) : d.archivo ? (
          <BotonVerArchivo className={ARCHIVO_ENLACE} url={d.archivoUrl} nombre={d.archivoNombre} icono={false}>
            {d.archivoNombre || "Ver documento"}
          </BotonVerArchivo>
        ) : (
          <div className={ARCHIVO_PENDIENTE}>Sin archivo adjunto</div>
        )}
      </div>

      <label className="icon-btn" title={d.archivo ? "Reemplazar archivo" : "Adjuntar archivo"} aria-label={`${d.archivo ? "Reemplazar" : "Adjuntar"} archivo de ${d.nombre}`}>
        <IconUpload />
        <input
          type="file"
          accept=".pdf,image/jpeg,image/png,image/webp"
          className="input-oculto"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            e.target.value = "";
            if (archivo) onSubirArchivo(d.id, archivo);
          }}
        />
      </label>
    </div>
  );
}

export default function ModalDocumentos({ open, vehiculo, onClose, onSubirArchivo, estadoDocumento, onEditarDocumentos }) {
  const todos = vehiculo ? [...vehiculo.documentos, ...vehiculo.documentosAnteriores] : [];
  // Mientras se sube cualquier documento, el modal no se cierra por accidente.
  const subiendoAlguno = todos.some((d) => estadoDocumento?.(d.id));

  return (
    <Modal
      open={open}
      ocupado={subiendoAlguno}
      title="Documentos"
      subtitle={vehiculo ? `${vehiculo.placa} — ${vehiculo.tipoUnidad} · ${AYUDA_ARCHIVO}` : ""}
      onClose={onClose}
      wide
    >
      {vehiculo && vehiculo.documentos.length === 0 && (
        <p className={MENSAJE_VACIO}>Este vehículo todavía no tiene documentos marcados. Usa “Editar documentos” para indicar cuáles tiene.</p>
      )}
      {vehiculo?.documentos.map((d) => (
        <FilaDocumento key={d.id} d={d} subiendo={estadoDocumento?.(d.id)} onSubirArchivo={onSubirArchivo} />
      ))}

      {vehiculo?.documentosAnteriores.length > 0 && (
        <>
          <h3 className="mx-0 mt-5 mb-1 text-md font-semibold">Documentos del sistema anterior</h3>
          <p className={AYUDA}>No tienen equivalente en el catálogo nuevo. Se conservan con su archivo, sin alertas.</p>
          {vehiculo.documentosAnteriores.map((d) => (
            <FilaDocumento key={d.id} d={d} subiendo={estadoDocumento?.(d.id)} onSubirArchivo={onSubirArchivo} />
          ))}
        </>
      )}

      <ModalActions onCancel={onClose} cancelLabel="Cerrar">
        <button className="btn-primary" type="button" onClick={() => onEditarDocumentos(vehiculo)}>
          Editar documentos
        </button>
      </ModalActions>
    </Modal>
  );
}
