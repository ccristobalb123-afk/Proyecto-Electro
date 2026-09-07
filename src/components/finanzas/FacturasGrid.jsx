import { IconFile, IconUpload, IconInvoice } from "../icons/Icons";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";
import { totalPagado, estadoPago } from "../../services/facturasService";
import { soles, formatFecha, ESTADO_PAGO_LABEL } from "./finanzasUtils";

export default function FacturasGrid({ cargando, error, onReintentar, facturas, onNuevo, onSubirComprobante, onRegistrarPago, onEditar, onAnular }) {
  if (cargando) return <Loading texto="Cargando..." />;
  if (error) return <EstadoError error={error} onReintentar={onReintentar} />;
  if (facturas.length === 0) {
    return (
      <EstadoVacio
        titulo="No hay facturas registradas"
        descripcion='Puedes registrar una nueva con el botón "Nueva factura".'
        accionLabel="Nueva factura"
        onAccion={onNuevo}
      />
    );
  }

  return (
    <div className="fin-grid">
      {facturas.map((f) => {
        const estado = estadoPago(f);
        const saldo = f.montoTotal - totalPagado(f.pagos);
        return (
          <div className="fin-card" key={f.id}>
            <div className="fin-card-header">
              <div>
                <div className="fin-card-titulo">{f.cliente}</div>
                <div className="fin-card-sub">
                  {f.serie}-{f.numero} · <span className={`co-badge ${f.empresa}`}>{f.empresa === "corevex" ? "Corevex" : "Electro"}</span>
                </div>
              </div>
              <span className={f.anulada ? "estado-pago anulada" : `estado-pago ${estado}`}>
                {f.anulada ? "Anulada" : ESTADO_PAGO_LABEL[estado]}
              </span>
            </div>

            <div className="fin-card-body">
              <div className="fin-card-montos">
                <div>
                  <span className="fin-card-label">Monto total</span>
                  <span className="fin-card-monto">{soles(f.montoTotal)}</span>
                </div>
                {estado !== "pendiente" && (
                  <div>
                    <span className="fin-card-label">Saldo pendiente</span>
                    <span className="fin-card-monto fin-card-monto--saldo">{soles(saldo)}</span>
                  </div>
                )}
              </div>

              <div className="fin-card-fechas">
                <div><span className="fin-card-label">Emisión</span><span>{formatFecha(f.fechaEmision)}</span></div>
                <div><span className="fin-card-label">Vencimiento</span><span>{formatFecha(f.fechaVencimiento)}</span></div>
              </div>

              {f.aplicaDetraccion && <span className="fin-tag-detraccion">Aplica detracción</span>}

              {f.archivo ? (
                <a className="fin-card-archivo fin-card-archivo--link" href="#" onClick={(e) => e.preventDefault()}>
                  <IconFile width={13} height={13} /> Ver comprobante
                </a>
              ) : (
                <label className="fin-card-archivo">
                  <IconUpload width={13} height={13} /> Adjuntar comprobante
                  <input type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={() => onSubirComprobante(f.id)} />
                </label>
              )}
            </div>

            <div className="fin-card-footer">
              {estado !== "pagado" && !f.anulada && (
                <button className="btn-outline-sm" type="button" onClick={() => onRegistrarPago("factura", f)}>
                  Registrar pago
                </button>
              )}
              {!f.anulada && (
                <button className="btn-outline-sm" type="button" onClick={() => onEditar(f)}>Editar</button>
              )}
              <button
                className="icon-btn"
                type="button"
                title={f.anulada ? "Ya está anulada" : "Anular factura"}
                disabled={f.anulada}
                onClick={() => onAnular(f)}
              >
                <IconInvoice width={15} height={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
