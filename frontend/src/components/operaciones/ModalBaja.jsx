import { BotonCarga } from "../shared/Carga";
import { Modal, ModalActions } from "../shared/Modal";
import { IconAlertCircle } from "../icons/Icons";

export default function ModalBaja({ open, equipo, motivo, setMotivo, error, onClose, onConfirmar, guardando, errorServidor }) {
  return (
    <Modal open={open} ocupado={guardando} title="Dar de baja" subtitle={equipo ? `${equipo.identificador} — ${equipo.categoria}` : ""} onClose={onClose}>
      <div className="danger-box">
        <div className="danger-title"><IconAlertCircle width={14} height={14} />Esta acción no se puede deshacer</div>
        <p className="danger-hint">El equipo pasará a De baja y no podrá volver a asignarse ni aparecer como disponible.</p>
      </div>
      <div className="form-field">
        <label>
          Motivo de la baja
          <textarea
            rows={4}
            placeholder="Ej. Desgaste irreversible tras inspección, no cumple estándar de seguridad..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </label>
        {error && <p className="field-error">Escribe un motivo antes de continuar.</p>}
      </div>
      {errorServidor && <p className="field-error" role="alert">{errorServidor}</p>}
      <ModalActions onCancel={onClose}>
        <BotonCarga className="btn-danger" cargando={guardando} textoCargando="Dando de baja…" onClick={onConfirmar}>
          Confirmar baja
        </BotonCarga>
      </ModalActions>
    </Modal>
  );
}
