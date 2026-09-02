import { Modal, ModalActions } from "../shared/Modal";
import { IconUpload, IconEye, IconAlertCircle } from "../icons/Icons";

export default function ModalInspeccion({ open, equipo, fInspeccion, setFInspeccion, onClose, onSubmit }) {
  return (
    <Modal
      open={open}
      title="Registrar inspección"
      subtitle={equipo ? `${equipo.codigo} — ${equipo.categoria}` : ""}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label>Tipo de inspección</label>
          <select value={fInspeccion.tipo} onChange={(e) => setFInspeccion({ ...fInspeccion, tipo: e.target.value })}>
            <option value="interna">Interna — con foto</option>
            <option value="externa">Externa — con certificado</option>
          </select>
        </div>

        <div className="form-field">
          <label>{fInspeccion.tipo === "interna" ? "Foto de la inspección" : "Certificado (PDF)"}</label>
          <label className="dropzone">
            <IconUpload width={22} height={22} />
            <p><b>Haz clic para subir</b> — {fInspeccion.tipo === "interna" ? "foto (JPG/PNG)" : "certificado (PDF)"}</p>
            <input type="file" hidden />
          </label>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Fecha de inspección</label>
            <input type="date" value={fInspeccion.fechaInspeccion} onChange={(e) => setFInspeccion({ ...fInspeccion, fechaInspeccion: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Fecha de vencimiento</label>
            <input type="date" value={fInspeccion.fechaVencimiento} onChange={(e) => setFInspeccion({ ...fInspeccion, fechaVencimiento: e.target.value })} />
          </div>
        </div>

        <div className="aviso-field">
          <label>Aviso de vencimiento</label>
          <div className="aviso-input-row">
            <input type="number" min={1} value={fInspeccion.diasAnticipacion} onChange={(e) => setFInspeccion({ ...fInspeccion, diasAnticipacion: Number(e.target.value) })} />
            <span>días antes del vencimiento</span>
          </div>
        </div>

        <div className="form-field">
          <label>Resultado</label>
          <select value={fInspeccion.resultado} onChange={(e) => setFInspeccion({ ...fInspeccion, resultado: e.target.value })}>
            <option value="aprobado">Aprobado</option>
            <option value="observado">Observado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>

        {fInspeccion.resultado === "aprobado" ? (
          <div className="consecuencia aprobado">
            <div className="consecuencia-title"><IconEye width={14} height={14} />El equipo queda Disponible</div>
            <p className="consecuencia-hint">Se actualiza la próxima inspección con esta fecha de vencimiento.</p>
          </div>
        ) : (
          <div className="consecuencia rechazado">
            <div className="consecuencia-title"><IconAlertCircle width={14} height={14} />El equipo pasa a Mantenimiento</div>
            <p className="consecuencia-hint">No podrá asignarse hasta una nueva inspección con resultado Aprobado.</p>
          </div>
        )}

        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">Guardar inspección</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
