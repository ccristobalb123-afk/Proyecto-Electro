import { Modal, ModalActions, CompanyChoice, CampoMontoConIgv, CampoDetraccion } from "../shared/Modal";

const IGV = 0.18;

export default function ModalNuevaFacturaPagar({ open, onClose, fFacturaPagar, setFFacturaPagar, onSubmit, editando, error, catalogoDetraccion }) {
  // Ver la misma nota en ModalNuevaFactura.jsx: la detracción se
  // calcula sobre el monto CON IGV, no sobre el monto base.
  const base = Number(fFacturaPagar.montoBase) || 0;
  const montoConIgv = fFacturaPagar.igvIncluido ? base : Number((base * (1 + IGV)).toFixed(2));

  return (
    <Modal
      open={open}
      title={editando ? "Editar factura por pagar" : "Nueva factura por pagar"}
      subtitle={editando ? fFacturaPagar.proveedor : "Completa los datos de la deuda con el proveedor."}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <fieldset className="form-field">
          <legend>Empresa</legend>
          <CompanyChoice name="empresaFacturaPagar" value={fFacturaPagar.empresa} onChange={(v) => setFFacturaPagar({ ...fFacturaPagar, empresa: v })} />
        </fieldset>
        <div className="form-field">
          <label>
            Proveedor
            <input required value={fFacturaPagar.proveedor} onChange={(e) => setFFacturaPagar({ ...fFacturaPagar, proveedor: e.target.value })} placeholder="Ej. Repuestos Lima SAC" />
          </label>
        </div>
        <div className="form-field">
          <label>
            Motivo
            <input value={fFacturaPagar.motivo} onChange={(e) => setFFacturaPagar({ ...fFacturaPagar, motivo: e.target.value })} placeholder="Ej. Repuestos camión ABC-123" />
          </label>
        </div>
        <CampoMontoConIgv
          montoBase={fFacturaPagar.montoBase}
          igvIncluido={fFacturaPagar.igvIncluido}
          onChange={({ montoBase, igvIncluido }) => setFFacturaPagar({ ...fFacturaPagar, montoBase, igvIncluido })}
        />
        <div className="form-row">
          <div className="form-field">
            <label>
              Fecha de emisión
              <input required type="date" value={fFacturaPagar.fechaEmision} onChange={(e) => setFFacturaPagar({ ...fFacturaPagar, fechaEmision: e.target.value })} />
            </label>
          </div>
          <div className="form-field">
            <label>
              Fecha de vencimiento
              <input required type="date" value={fFacturaPagar.fechaVencimiento} onChange={(e) => setFFacturaPagar({ ...fFacturaPagar, fechaVencimiento: e.target.value })} />
            </label>
          </div>
        </div>
        <CampoDetraccion
          catalogo={catalogoDetraccion}
          montoTotal={montoConIgv}
          catalogoDetraccionId={fFacturaPagar.catalogoDetraccionId}
          detraccionMedioPago={fFacturaPagar.detraccionMedioPago}
          detraccionCuentaBn={fFacturaPagar.detraccionCuentaBn}
          onChange={(v) => setFFacturaPagar({ ...fFacturaPagar, ...v })}
        />
        {error && <p className="field-error">{error}</p>}
        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">{editando ? "Guardar cambios" : "Guardar"}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
