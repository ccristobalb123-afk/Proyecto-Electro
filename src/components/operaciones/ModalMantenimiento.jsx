import { Modal, ModalActions } from "../shared/Modal";
import { IconAlertCircle } from "../icons/Icons";

export default function ModalMantenimiento({ open, equipo, comentario, setComentario, error, onClose, onConfirmar }) {
  return (
    <Modal
      open={open}
      title="Enviar a mantenimiento"
      subtitle={equipo ? `${equipo.codigo} — ${equipo.categoria}` : ""}
      onClose={onClose}
    >
      <div className="danger-box" style={{ background: "var(--volt-tint)" }}>
        <div className="danger-title" style={{ color: "var(--volt-dark)" }}>
          <IconAlertCircle width={14} height={14} />
          Cuenta qué le pasa al equipo
        </div>
        <p className="danger-hint" style={{ color: "var(--volt-dark)" }}>
          Este comentario queda guardado en la hoja de vida del equipo, para que quien lo reciba
          en mantenimiento sepa exactamente qué revisar.
        </p>
      </div>

      <div className="form-field">
        <label>¿Qué tiene el equipo?</label>
        <textarea
          rows={4}
          placeholder="Ej. Cable deshilachado en el mosquetón, falla en el cierre automático..."
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
        {error && <p className="field-error">Cuenta qué tiene el equipo antes de continuar.</p>}
      </div>

      <ModalActions onCancel={onClose}>
        <button className="btn-primary" type="button" onClick={onConfirmar}>Enviar a mantenimiento</button>
      </ModalActions>
    </Modal>
  );
}
