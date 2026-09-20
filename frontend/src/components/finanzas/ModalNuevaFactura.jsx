import { Modal, ModalActions, CompanyChoice, AvisoVencimiento, CampoMontoConIgv, CampoDetraccion } from "../shared/Modal";

const IGV = 0.18;

export default function ModalNuevaFactura({ open, onClose, fFactura, setFFactura, onSubmit, editando, error, catalogoDetraccion }) {
  // La detracción siempre se calcula sobre el monto CON IGV (el total
  // real de la factura), nunca sobre el monto base — antes se le
  // pasaba el monto sin IGV a la vista previa, mostrando un neto a
  // depositar incorrecto cuando se elegía "Agregar IGV".
  const base = Number(fFactura.montoBase) || 0;
  const montoConIgv = fFactura.igvIncluido ? base : Number((base * (1 + IGV)).toFixed(2));

  return (
    <Modal
      open={open}
      title={editando ? "Editar factura" : "Nueva factura"}
      subtitle={editando ? `${fFactura.serie}-${fFactura.numero}` : "Completa los datos de la factura al cliente."}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <fieldset className="form-field">
          <legend>Empresa</legend>
          <CompanyChoice name="empresaFactura" value={fFactura.empresa} onChange={(v) => setFFactura({ ...fFactura, empresa: v })} />
        </fieldset>
        <div className="form-field">
          <label>
            Cliente
            <input required value={fFactura.cliente} onChange={(e) => setFFactura({ ...fFactura, cliente: e.target.value })} placeholder="Ej. Tecsur S.A." />
          </label>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>
              Serie
              <input required value={fFactura.serie} onChange={(e) => setFFactura({ ...fFactura, serie: e.target.value })} placeholder="F001" />
            </label>
          </div>
          <div className="form-field">
            <label>
              Número
              <input required value={fFactura.numero} onChange={(e) => setFFactura({ ...fFactura, numero: e.target.value })} placeholder="00821" />
            </label>
          </div>
        </div>
        <CampoMontoConIgv
          montoBase={fFactura.montoBase}
          igvIncluido={fFactura.igvIncluido}
          onChange={({ montoBase, igvIncluido }) => setFFactura({ ...fFactura, montoBase, igvIncluido })}
        />
        <div className="form-row">
          <div className="form-field">
            <label>
              Fecha de emisión
              <input required type="date" value={fFactura.fechaEmision} onChange={(e) => setFFactura({ ...fFactura, fechaEmision: e.target.value })} />
            </label>
          </div>
          <div className="form-field">
            <label>
              Fecha de vencimiento
              <input required type="date" value={fFactura.fechaVencimiento} onChange={(e) => setFFactura({ ...fFactura, fechaVencimiento: e.target.value })} />
            </label>
          </div>
        </div>
        <CampoDetraccion
          catalogo={catalogoDetraccion}
          montoTotal={montoConIgv}
          catalogoDetraccionId={fFactura.catalogoDetraccionId}
          detraccionMedioPago={fFactura.detraccionMedioPago}
          detraccionCuentaBn={fFactura.detraccionCuentaBn}
          onChange={(v) => setFFactura({ ...fFactura, ...v })}
        />
        <AvisoVencimiento value={fFactura.diasAviso} onChange={(v) => setFFactura({ ...fFactura, diasAviso: v })} />
        {error && <p className="field-error">{error}</p>}
        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">{editando ? "Guardar cambios" : "Guardar factura"}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
