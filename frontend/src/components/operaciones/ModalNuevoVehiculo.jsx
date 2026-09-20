import { Modal, ModalActions, CompanyChoice } from "../shared/Modal";
import { IconAlertCircle } from "../icons/Icons";
import { TIPOS_UNIDAD } from "../../services/vehiculosService";

export default function ModalNuevoVehiculo({ open, onClose, fVehiculo, setFVehiculo, onSubmit, error }) {
  return (
    <Modal open={open} title="Nuevo vehículo" subtitle="Completa los datos del vehículo." onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <div className="form-field">
            <label>
              Placa
              <input value={fVehiculo.placa} onChange={(e) => setFVehiculo({ ...fVehiculo, placa: e.target.value })} placeholder="Ej. A7P-925" />
            </label>
          </div>
          <div className="form-field">
            <label>
              Tipo de unidad
              <select value={fVehiculo.tipoUnidad} onChange={(e) => setFVehiculo({ ...fVehiculo, tipoUnidad: e.target.value })}>
                {TIPOS_UNIDAD.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {fVehiculo.tipoUnidad === "Grúa" && (
          <div className="consecuencia advertencia">
            <div className="consecuencia-title">
              <IconAlertCircle width={14} height={14} />
              Documento adicional requerido
            </div>
            <p className="consecuencia-hint">
              Las grúas también necesitan el certificado de Brazo hidráulico, además de los 5 documentos base.
            </p>
          </div>
        )}

        <fieldset className="form-field">
          <legend>Empresa dueña</legend>
          <CompanyChoice name="empresaVehiculo" value={fVehiculo.empresa} onChange={(v) => setFVehiculo({ ...fVehiculo, empresa: v })} />
        </fieldset>

        <div className="form-field">
          <label>
            Cuadrilla / Proyecto
            <input value={fVehiculo.cuadrilla} onChange={(e) => setFVehiculo({ ...fVehiculo, cuadrilla: e.target.value })} placeholder="Ej. Cuadrilla Yerson H." />
          </label>
        </div>

        {error && <p className="field-error">{error}</p>}

        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">Guardar vehículo</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
