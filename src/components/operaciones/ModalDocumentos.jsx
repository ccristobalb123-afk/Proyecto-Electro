import { Modal, ModalActions } from "../shared/Modal";
import { IconFile, IconUpload } from "../icons/Icons";

export default function ModalDocumentos({ open, vehiculo, onClose, onSubirArchivo }) {
  return (
    <Modal open={open} title="Documentos" subtitle={vehiculo ? `${vehiculo.placa} — ${vehiculo.tipoUnidad}` : ""} onClose={onClose} wide>
      {vehiculo &&
        vehiculo.documentos.map((d, i) => (
          <div className="docs-list-item" key={i}>
            <div className="docs-row-icon"><IconFile width={16} height={16} /></div>
            <div className="docs-row-main">
              {d.archivo ? (
                <a
                  className="docs-row-title docs-row-title--link"
                  href={d.archivoUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir el documento adjunto"
                >
                  {d.tipo}
                </a>
              ) : (
                <div className="docs-row-title">{d.tipo}</div>
              )}
              <div className="docs-row-sub" style={{ color: d.archivo ? "var(--muted)" : "var(--danger-dark)" }}>
                {d.archivo ? d.archivoNombre || "documento.pdf" : "Sin adjuntar"}
              </div>
            </div>
            {d.dias !== null && <span className={`tag ${d.estado}`}>{d.dias}d</span>}

            <label className="icon-btn" title={d.archivo ? "Reemplazar archivo" : "Adjuntar archivo"}>
              <IconUpload />
              <input
                type="file"
                accept=".pdf,image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const archivo = e.target.files[0];
                  if (!archivo) return;
                  onSubirArchivo(i, archivo);
                }}
              />
            </label>
          </div>
        ))}
      <ModalActions onCancel={onClose} cancelLabel="Cerrar" />
    </Modal>
  );
}
