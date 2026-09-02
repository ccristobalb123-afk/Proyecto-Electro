import { Modal, ModalActions, Timeline } from "../shared/Modal";
import { totalPagado } from "../../services/facturasService";
import { soles, formatFecha } from "./finanzasUtils";

export default function ModalRegistrarPago({ open, pago, montoPago, setMontoPago, errorPago, onClose, onConfirmar }) {
  return (
    <Modal
      open={open}
      title="Registrar pago"
      subtitle={
        pago
          ? `${pago.tipo === "factura" ? pago.doc.cliente : pago.doc.proveedor} — Saldo: ${soles(pago.doc.montoTotal - totalPagado(pago.doc.pagos))}`
          : ""
      }
      onClose={onClose}
    >
      {pago && (
        <>
          <div className="form-field">
            <label>Monto del pago</label>
            <input
              type="number" min="0" step="0.01" autoFocus
              value={montoPago}
              onChange={(e) => setMontoPago(e.target.value)}
              placeholder="0.00"
            />
          </div>
          {errorPago && <p className="field-error">{errorPago}</p>}
          {pago.doc.pagos.length > 0 && (
            <div className="fin-pagos-previos">
              <span className="fin-card-label">Pagos registrados</span>
              <Timeline items={pago.doc.pagos.map((p) => ({ titulo: soles(p.monto), fecha: formatFecha(p.fecha) }))} />
            </div>
          )}
          <ModalActions onCancel={onClose}>
            <button className="btn-primary" type="button" onClick={onConfirmar}>Registrar pago</button>
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
