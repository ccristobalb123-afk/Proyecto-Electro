import { Modal, ModalActions, CompanyChoice } from "../shared/Modal";

export default function ModalNuevaFacturaPagar({ open, onClose, fFacturaPagar, setFFacturaPagar, onSubmit, editando }) {
  return (
    <Modal
      open={open}
      title={editando ? "Editar factura por pagar" : "Nueva factura por pagar"}
      subtitle={editando ? fFacturaPagar.proveedor : "Completa los datos de la deuda con el proveedor."}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label>Empresa</label>
          <CompanyChoice name="empresaFacturaPagar" value={fFacturaPagar.empresa} onChange={(v) => setFFacturaPagar({ ...fFacturaPagar, empresa: v })} />
        </div>
        <div className="form-field">
          <label>Proveedor</label>
          <input required value={fFacturaPagar.proveedor} onChange={(e) => setFFacturaPagar({ ...fFacturaPagar, proveedor: e.target.value })} placeholder="Ej. Repuestos Lima SAC" />
        </div>
        <div className="form-field">
          <label>Motivo</label>
          <input value={fFacturaPagar.motivo} onChange={(e) => setFFacturaPagar({ ...fFacturaPagar, motivo: e.target.value })} placeholder="Ej. Repuestos camión ABC-123" />
        </div>
        <div className="form-field">
          <label>Monto total</label>
          <input required type="number" min="0" step="0.01" value={fFacturaPagar.montoTotal} onChange={(e) => setFFacturaPagar({ ...fFacturaPagar, montoTotal: e.target.value })} placeholder="0.00" />
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>Fecha de emisión</label>
            <input required type="date" value={fFacturaPagar.fechaEmision} onChange={(e) => setFFacturaPagar({ ...fFacturaPagar, fechaEmision: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Fecha de vencimiento</label>
            <input required type="date" value={fFacturaPagar.fechaVencimiento} onChange={(e) => setFFacturaPagar({ ...fFacturaPagar, fechaVencimiento: e.target.value })} />
          </div>
        </div>
        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">{editando ? "Guardar cambios" : "Guardar"}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
