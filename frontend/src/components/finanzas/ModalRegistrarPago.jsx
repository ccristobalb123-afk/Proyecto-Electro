import { Modal, ModalActions, Timeline } from "../shared/Modal";
import { totalPagado, montoNetoAPagar } from "../../services/facturasService";
import { soles, formatFecha } from "./finanzasUtils";
import { BotonCarga } from "../shared/Carga";

export default function ModalRegistrarPago({ open, pago, montoPago, setMontoPago, errorPago, onClose, onConfirmar, registrando }) {
  return (
    <Modal
      open={open}
      ocupado={registrando}
      title="Registrar pago"
      subtitle={
        pago
          ? `${pago.tipo === "factura" ? pago.doc.cliente : pago.doc.proveedor} — Saldo: ${soles(montoNetoAPagar(pago.doc) - totalPagado(pago.doc.pagos))}`
          : ""
      }
      onClose={onClose}
    >
      {pago && (
        <>
          <div className="form-field">
            <label>
              Monto del pago
              <input
                type="number" min="0" step="0.01" autoFocus
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>
          {errorPago && <p className="field-error" role="alert">{errorPago}</p>}
          {pago.doc.pagos.length > 0 && (
            <div className="fin-pagos-previos">
              <span className="fin-card-label">Pagos registrados</span>
              <Timeline items={pago.doc.pagos.map((p) => ({ titulo: soles(p.monto), fecha: formatFecha(p.fecha) }))} />
            </div>
          )}
          <ModalActions onCancel={onClose}>
            <BotonCarga cargando={registrando} textoCargando="Registrando pago…" onClick={onConfirmar}>
              Registrar pago
            </BotonCarga>
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
