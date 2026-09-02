import { Modal, ModalActions, CompanyChoice, AvisoVencimiento } from "../shared/Modal";

export default function ModalNuevaFactura({ open, onClose, fFactura, setFFactura, onSubmit }) {
  return (
    <Modal open={open} title="Nueva factura" subtitle="Completa los datos de la factura al cliente." onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label>Empresa</label>
          <CompanyChoice name="empresaFactura" value={fFactura.empresa} onChange={(v) => setFFactura({ ...fFactura, empresa: v })} />
        </div>
        <div className="form-field">
          <label>Cliente</label>
          <input required value={fFactura.cliente} onChange={(e) => setFFactura({ ...fFactura, cliente: e.target.value })} placeholder="Ej. Tecsur S.A." />
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>Serie</label>
            <input required value={fFactura.serie} onChange={(e) => setFFactura({ ...fFactura, serie: e.target.value })} placeholder="F001" />
          </div>
          <div className="form-field">
            <label>Número</label>
            <input required value={fFactura.numero} onChange={(e) => setFFactura({ ...fFactura, numero: e.target.value })} placeholder="00821" />
          </div>
        </div>
        <div className="form-field">
          <label>Monto total (incluye IGV)</label>
          <input required type="number" min="0" step="0.01" value={fFactura.montoTotal} onChange={(e) => setFFactura({ ...fFactura, montoTotal: e.target.value })} placeholder="0.00" />
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>Fecha de emisión</label>
            <input required type="date" value={fFactura.fechaEmision} onChange={(e) => setFFactura({ ...fFactura, fechaEmision: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Fecha de vencimiento</label>
            <input required type="date" value={fFactura.fechaVencimiento} onChange={(e) => setFFactura({ ...fFactura, fechaVencimiento: e.target.value })} />
          </div>
        </div>
        <label className="field-check">
          <input type="checkbox" checked={fFactura.aplicaDetraccion} onChange={(e) => setFFactura({ ...fFactura, aplicaDetraccion: e.target.checked })} />
          <span>Aplica detracción</span>
        </label>
        <AvisoVencimiento value={fFactura.diasAviso} onChange={(v) => setFFactura({ ...fFactura, diasAviso: v })} />
        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">Guardar factura</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
