import { BotonCarga } from "../shared/Carga";
import { Modal, ModalActions } from "../shared/Modal";
import { IconAlertCircle } from "../icons/Icons";
import { CAMPO, ERROR_CAMPO, RECUADRO, RECUADRO_TEXTO, RECUADRO_TITULO } from "../shared/clasesModal";

export default function ModalBaja({ open, equipo, motivo, setMotivo, error, onClose, onConfirmar, guardando, errorServidor }) {
  return (
    <Modal open={open} ocupado={guardando} title="Dar de baja" subtitle={equipo ? `${equipo.identificador} — ${equipo.categoria}` : ""} onClose={onClose}>
      <div className={RECUADRO.peligro}>
        <div className={RECUADRO_TITULO.peligro}><IconAlertCircle width={14} height={14} />Esta acción no se puede deshacer</div>
        <p className={RECUADRO_TEXTO.peligro}>
          El equipo pasará a De baja y no podrá volver a asignarse ni aparecer como disponible.
          {equipo?.responsable && ` Deja de estar asignado a ${equipo.responsable}.`}
        </p>
      </div>
      <div className={CAMPO}>
        <label>
          Motivo de la baja
          <textarea
            rows={4}
            placeholder="Ej. Desgaste irreversible tras inspección, no cumple estándar de seguridad..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </label>
        {error && <p className={ERROR_CAMPO}>Escribe un motivo antes de continuar.</p>}
      </div>
      {errorServidor && <p className={ERROR_CAMPO} role="alert">{errorServidor}</p>}
      <ModalActions onCancel={onClose}>
        <BotonCarga className="btn-danger" cargando={guardando} textoCargando="Dando de baja…" onClick={onConfirmar}>
          Confirmar baja
        </BotonCarga>
      </ModalActions>
    </Modal>
  );
}
