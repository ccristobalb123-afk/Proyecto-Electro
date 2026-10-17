import { soles, formatFecha, TIPO_COMPROBANTE_LABEL } from "./finanzasUtils";

/**
 * Mensaje del diálogo "¿Eliminar este gasto?": qué gasto es (para no
 * borrar el equivocado) y que se borra también su comprobante. Va dentro
 * del <p> del diálogo, así que solo usa elementos en línea.
 */
export default function DetalleEliminarGasto({ gasto: g }) {
  const quien = g.proveedor || g.trabajador || g.descripcion;
  return (
    <>
      <span className="confirm-gasto">
        <span>
          <b>Gasto N.º {g.id}</b> · {g.tipoComprobante ? TIPO_COMPROBANTE_LABEL[g.tipoComprobante] : "Sin tipo de comprobante"}
        </span>
        <span>
          {quien ? `${quien} · ` : ""}
          {g.categoria}
        </span>
        <span>
          <b>{soles(g.monto)}</b> · {formatFecha(g.fecha)}
        </span>
      </span>
      {g.archivo ? (
        <>
          Se borrará también su comprobante adjunto (<b>{g.archivoNombre || "documento"}</b>).{" "}
        </>
      ) : (
        "Este gasto no tiene comprobante adjunto. "
      )}
      Esta acción no se puede deshacer.
    </>
  );
}
