import { BotonCarga } from "../shared/Carga";
import { Modal, ModalActions } from "../shared/Modal";
import { IconAlertCircle } from "../icons/Icons";

export default function ModalMantenimiento({ open, equipo, comentario, setComentario, error, onClose, onConfirmar, guardando, errorServidor }) {
  return (
    <Modal
      open={open}
      ocupado={guardando}
      title="Enviar a mantenimiento"
      subtitle={equipo ? `${equipo.identificador} — ${equipo.categoria}` : ""}
      onClose={onClose}
    >
      <div className="danger-box advertencia">
        <div className="danger-title">
          <IconAlertCircle width={14} height={14} />
          Cuenta qué le pasa al equipo
        </div>
        <p className="danger-hint">
          Este comentario queda guardado en la hoja de vida del equipo, para que quien lo reciba
          en mantenimiento sepa exactamente qué revisar.
        </p>
      </div>

      <div className="form-field">
        <label htmlFor="mantenimiento-comentario">¿Qué tiene el equipo?</label>
        <textarea
          id="mantenimiento-comentario"
          rows={4}
          placeholder="Ej. Cable deshilachado en el mosquetón, falla en el cierre automático..."
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
        {error && <p className="field-error">Cuenta qué tiene el equipo antes de continuar.</p>}
      </div>

      {errorServidor && <p className="field-error" role="alert">{errorServidor}</p>}
      <ModalActions onCancel={onClose}>
        <BotonCarga cargando={guardando} textoCargando="Enviando…" onClick={onConfirmar}>
          Enviar a mantenimiento
        </BotonCarga>
      </ModalActions>
    </Modal>
  );
}
