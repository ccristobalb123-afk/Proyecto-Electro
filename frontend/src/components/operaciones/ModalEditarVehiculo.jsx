import { Modal, ModalActions } from "../shared/Modal";

export default function ModalEditarVehiculo({ open, onClose, fVehiculo, setFVehiculo, onSubmit, error }) {
  return (
    <Modal open={open} title="Editar vehículo" subtitle={fVehiculo.placa} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label>
            Placa
            <input required value={fVehiculo.placa} onChange={(e) => setFVehiculo({ ...fVehiculo, placa: e.target.value })} />
          </label>
        </div>
        <div className="form-field">
          <label>
            Cuadrilla (opcional)
            <input value={fVehiculo.cuadrilla} onChange={(e) => setFVehiculo({ ...fVehiculo, cuadrilla: e.target.value })} placeholder="Ej. Cuadrilla 3" />
          </label>
        </div>
        {error && <p className="field-error">{error}</p>}
        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">Guardar cambios</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
