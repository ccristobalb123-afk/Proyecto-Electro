import { Modal, ModalActions, CompanyChoice } from "../shared/Modal";
import { IconAlertCircle } from "../icons/Icons";
import { TIPOS_UNIDAD } from "../../services/vehiculosService";

export default function ModalNuevoVehiculo({ open, onClose, fVehiculo, setFVehiculo, onSubmit }) {
  return (
    <Modal open={open} title="Nuevo vehículo" subtitle="Completa los datos del vehículo." onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <div className="form-field">
            <label>Placa</label>
            <input value={fVehiculo.placa} onChange={(e) => setFVehiculo({ ...fVehiculo, placa: e.target.value })} placeholder="Ej. A7P-925" />
          </div>
          <div className="form-field">
            <label>Tipo de unidad</label>
            <select value={fVehiculo.tipoUnidad} onChange={(e) => setFVehiculo({ ...fVehiculo, tipoUnidad: e.target.value })}>
              {TIPOS_UNIDAD.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {fVehiculo.tipoUnidad === "Grúa" && (
          <div className="consecuencia aprobado" style={{ background: "var(--volt-tint)" }}>
            <div className="consecuencia-title" style={{ color: "var(--volt-dark)" }}>
              <IconAlertCircle width={14} height={14} />
              Documento adicional requerido
            </div>
            <p className="consecuencia-hint" style={{ color: "var(--volt-dark)" }}>
              Las grúas también necesitan el certificado de Brazo hidráulico, además de los 5 documentos base.
            </p>
          </div>
        )}

        <div className="form-field">
          <label>Empresa dueña</label>
          <CompanyChoice name="empresaVehiculo" value={fVehiculo.empresa} onChange={(v) => setFVehiculo({ ...fVehiculo, empresa: v })} />
        </div>

        <div className="form-field">
          <label>Cuadrilla / Proyecto</label>
          <input value={fVehiculo.cuadrilla} onChange={(e) => setFVehiculo({ ...fVehiculo, cuadrilla: e.target.value })} placeholder="Ej. Cuadrilla Yerson H." />
        </div>

        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">Guardar vehículo</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
