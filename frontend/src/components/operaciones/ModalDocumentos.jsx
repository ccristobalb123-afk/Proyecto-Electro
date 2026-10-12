import { Modal, ModalActions } from "../shared/Modal";
import { IconFile, IconUpload } from "../icons/Icons";
import { BotonVerArchivo } from "../shared/VisorArchivo";

export default function ModalDocumentos({ open, vehiculo, onClose, onSubirArchivo }) {
  return (
    <Modal open={open} title="Documentos" subtitle={vehiculo ? `${vehiculo.placa} — ${vehiculo.tipoUnidad}` : ""} onClose={onClose} wide>
      {vehiculo &&
        vehiculo.documentos.map((d) => (
          <div className="docs-list-item" key={d.id}>
            <div className="docs-row-icon"><IconFile width={16} height={16} /></div>
            <div className="docs-row-main">
              <div className="docs-row-title">{d.tipo}</div>
              {d.archivo ? (
                <BotonVerArchivo className="docs-row-sub docs-row-sub--link" url={d.archivoUrl} nombre={d.archivoNombre} icono={false}>
                  {d.archivoNombre || "Ver documento"}
                </BotonVerArchivo>
              ) : (
                <div className="docs-row-sub docs-row-sub--pendiente">Sin adjuntar</div>
              )}
            </div>
            {d.dias !== null && <span className={`tag ${d.estado}`}>{d.dias}d</span>}

            <label className="icon-btn" title={d.archivo ? "Reemplazar archivo" : "Adjuntar archivo"}>
              <IconUpload />
              <input
                type="file"
                accept=".pdf,image/*"
                className="input-oculto"
                onChange={(e) => {
                  const archivo = e.target.files[0];
                  if (!archivo) return;
                  onSubirArchivo(d.id, archivo);
                }}
              />
            </label>
          </div>
        ))}
      <ModalActions onCancel={onClose} cancelLabel="Cerrar" />
    </Modal>
  );
}
