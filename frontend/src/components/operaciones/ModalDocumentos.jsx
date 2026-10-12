import { Modal, ModalActions } from "../shared/Modal";
import { IconFile, IconUpload } from "../icons/Icons";
import { BotonVerArchivo } from "../shared/VisorArchivo";
import { Spinner } from "../shared/Carga";
import EstadoDocumento from "./EstadoDocumento";
import { AYUDA_ARCHIVO } from "../../services/uploadsService";
import { fechaCorta } from "../../services/vehiculosService";

// Una fila: nombre, estado, fechas, y ver / adjuntar / reemplazar archivo.
function FilaDocumento({ d, subiendo, onSubirArchivo }) {
  return (
    <div className="docs-list-item">
      <div className="docs-row-icon"><IconFile width={16} height={16} /></div>
      <div className="docs-row-main">
        <div className="docs-row-title">{d.nombre}</div>
        {!d.legado && (
          <div className="docs-row-fechas">
            <EstadoDocumento documento={d} />
            <span>
              {d.fechaEmision && `Emitido ${fechaCorta(d.fechaEmision)} · `}
              {d.fechaVencimiento ? `Vence ${fechaCorta(d.fechaVencimiento)} · aviso ${d.diasAnticipacion} días antes` : d.estado === "novence" ? "Sin vencimiento" : "Falta el vencimiento"}
            </span>
          </div>
        )}
        {subiendo ? (
          <div className="docs-row-sub docs-row-sub--subiendo" role="status">
            <Spinner tamano={12} />
            {subiendo}
          </div>
        ) : d.archivo ? (
          <BotonVerArchivo className="docs-row-sub docs-row-sub--link" url={d.archivoUrl} nombre={d.archivoNombre} icono={false}>
            {d.archivoNombre || "Ver documento"}
          </BotonVerArchivo>
        ) : (
          <div className="docs-row-sub docs-row-sub--pendiente">Sin archivo adjunto</div>
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
        <p className="modal-mensaje-vacio">Este vehículo todavía no tiene documentos marcados. Usa “Editar documentos” para indicar cuáles tiene.</p>
      )}
      {vehiculo?.documentos.map((d) => (
        <FilaDocumento key={d.id} d={d} subiendo={estadoDocumento?.(d.id)} onSubirArchivo={onSubirArchivo} />
      ))}

      {vehiculo?.documentosAnteriores.length > 0 && (
        <>
          <h3 className="docs-seccion-titulo">Documentos del sistema anterior</h3>
          <p className="campo-ayuda">No tienen equivalente en el catálogo nuevo. Se conservan con su archivo, sin alertas.</p>
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
