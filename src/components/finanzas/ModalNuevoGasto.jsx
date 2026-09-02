import { Modal, ModalActions, CompanyChoice } from "../shared/Modal";
import { CATEGORIAS_GASTO } from "../../services/finanzasService";

export default function ModalNuevoGasto({ open, onClose, fGasto, setFGasto, onSubmit }) {
  return (
    <Modal open={open} title="Nuevo gasto" subtitle="Registra un gasto de la empresa." onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label>Empresa</label>
          <CompanyChoice name="empresaGasto" value={fGasto.empresa} onChange={(v) => setFGasto({ ...fGasto, empresa: v })} />
        </div>
        <div className="form-field">
          <label>Categoría</label>
          <select value={fGasto.categoria} onChange={(e) => setFGasto({ ...fGasto, categoria: e.target.value })}>
            {CATEGORIAS_GASTO.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {fGasto.categoria === "Bono" ? (
          <div className="form-field">
            <label>Trabajador</label>
            <input value={fGasto.trabajador} onChange={(e) => setFGasto({ ...fGasto, trabajador: e.target.value })} placeholder="Nombre del trabajador" />
          </div>
        ) : (
          <div className="form-field">
            <label>Proveedor (opcional)</label>
            <input value={fGasto.proveedor} onChange={(e) => setFGasto({ ...fGasto, proveedor: e.target.value })} placeholder="Ej. Grifo Primax" />
          </div>
        )}
        <div className="form-row">
          <div className="form-field">
            <label>Monto</label>
            <input required type="number" min="0" step="0.01" value={fGasto.monto} onChange={(e) => setFGasto({ ...fGasto, monto: e.target.value })} placeholder="0.00" />
          </div>
          <div className="form-field">
            <label>Fecha</label>
            <input required type="date" value={fGasto.fecha} onChange={(e) => setFGasto({ ...fGasto, fecha: e.target.value })} />
          </div>
        </div>
        <div className="form-field">
          <label>Descripción (opcional)</label>
          <input value={fGasto.descripcion} onChange={(e) => setFGasto({ ...fGasto, descripcion: e.target.value })} placeholder="Ej. Qué se compró" />
        </div>
        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">Guardar gasto</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
