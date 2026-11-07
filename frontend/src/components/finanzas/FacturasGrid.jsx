import CampoComprobante from "./CampoComprobante";
import { IconInvoice } from "../icons/Icons";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";
import { totalPagado, estadoPago, montoNetoAPagar } from "../../services/facturasService";
import { soles, formatFecha, ESTADO_PAGO_LABEL } from "./finanzasUtils";
import { CABECERA, CABECERA_TEXTO, CUERPO, DETRACCION, ESTADO_PAGO, ETIQUETA, FECHA, FECHAS, GRILLA, MONTO, MONTO_SALDO, MONTOS, PIE, SUBTITULO, TARJETA, TITULO } from "./clasesFinanzas";

export default function FacturasGrid({ cargando, error, onReintentar, facturas, onNuevo, onSubirComprobante, estadoComprobante, onRegistrarPago, onEditar, onAnular }) {
  if (cargando) return <Loading texto="Cargando facturas…" />;
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
    <div className={GRILLA}>
      {facturas.map((f) => {
        const estado = estadoPago(f);
        const saldo = montoNetoAPagar(f) - totalPagado(f.pagos);
        return (
          <div className={TARJETA} key={f.id}>
            <div className={CABECERA}>
              <div className={CABECERA_TEXTO}>
                <div className={TITULO}>{f.cliente}</div>
                <div className={SUBTITULO}>
                  {f.serie}-{f.numero} · <span className={`co-badge ${f.empresa}`}>{f.empresa === "corevex" ? "Corevex" : "Electro"}</span>
                </div>
              </div>
              <span className={ESTADO_PAGO[f.anulada ? "anulada" : estado]}>
                {f.anulada ? "Anulada" : ESTADO_PAGO_LABEL[estado]}
              </span>
            </div>

            <div className={CUERPO}>
              <div className={MONTOS}>
                <div>
                  <span className={ETIQUETA}>Monto total</span>
                  <span className={MONTO}>{soles(f.montoTotal)}</span>
                </div>
                {estado !== "pendiente" && (
                  <div>
                    <span className={ETIQUETA}>Saldo pendiente</span>
                    <span className={MONTO_SALDO}>{soles(saldo)}</span>
                  </div>
                )}
              </div>

              <div className={FECHAS}>
                <div className={FECHA}><span className={ETIQUETA}>Emisión</span><span>{formatFecha(f.fechaEmision)}</span></div>
                <div className={FECHA}><span className={ETIQUETA}>Vencimiento</span><span>{formatFecha(f.fechaVencimiento)}</span></div>
              </div>

              {f.catalogoDetraccion && (
                <span className={DETRACCION}>
                  {f.catalogoDetraccion.codigo} · {f.catalogoDetraccion.descripcion} — {soles(f.montoDetraccion)}
                </span>
              )}

              <CampoComprobante item={f} estado={estadoComprobante?.(f.id)} onSubir={onSubirComprobante} />
            </div>

            <div className={PIE}>
              {estado !== "pagado" && !f.anulada && (
                <button className="btn-outline-sm" type="button" onClick={() => onRegistrarPago("factura", f)}>
                  Registrar pago
                </button>
              )}
              {!f.anulada && (
                <button className="btn-outline-sm" type="button" onClick={() => onEditar(f)}>Editar</button>
              )}
              <button
                className="icon-btn icon-btn--peligro"
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
