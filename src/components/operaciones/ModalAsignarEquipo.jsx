import { Modal, ModalActions } from "../shared/Modal";
import { IconAlertCircle } from "../icons/Icons";

export default function ModalAsignarEquipo({ open, equipo, vehiculos, vehiculoId, setVehiculoId, error, onClose, onConfirmar }) {
  return (
    <Modal
      open={open}
      title="Asignar equipo"
      subtitle={equipo ? `${equipo.codigo} — ${equipo.categoria}` : ""}
      onClose={onClose}
    >
      {vehiculos.length === 0 ? (
        <div className="danger-box">
          <div className="danger-title">
            <IconAlertCircle width={14} height={14} />
            No hay camiones registrados para {equipo?.empresa === "corevex" ? "CorevexSAC" : "ElectroSAC"}
          </div>
          <p className="danger-hint">
            Registra primero el camión en la pestaña Vehículos antes de poder asignarle este equipo.
          </p>
        </div>
      ) : (
        <div className="form-field">
          <label>Camión</label>
          <select value={vehiculoId} onChange={(e) => setVehiculoId(e.target.value)}>
            <option value="">Selecciona un camión registrado...</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.placa} — {v.tipoUnidad}
                {v.cuadrilla ? ` (${v.cuadrilla})` : ""}
              </option>
            ))}
          </select>
          {error && <p className="field-error">Elige un camión antes de continuar.</p>}
        </div>
      )}

      <ModalActions onCancel={onClose}>
        {vehiculos.length > 0 && (
          <button className="btn-primary" type="button" onClick={onConfirmar}>Asignar</button>
        )}
      </ModalActions>
    </Modal>
  );
}
