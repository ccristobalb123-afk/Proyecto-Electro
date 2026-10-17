import { IconTrash } from "../icons/Icons";
import { BotonVerArchivo } from "../shared/VisorArchivo";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";
import { soles, formatFecha, TIPO_COMPROBANTE_LABEL } from "./finanzasUtils";

// Gastos anteriores a oct 2026 no tienen tipo ni documento: se muestran
// con "—" y "Sin documento", con el aviso "Faltan datos" (se completan
// al editarlos, con el documento ahora obligatorio).
export default function GastosGrid({ cargando, error, onReintentar, gastos, hayFiltros, onNuevo, onEditar, onEliminar }) {
  if (cargando) return <Loading texto="Cargando gastos…" />;
  if (error) return <EstadoError error={error} onReintentar={onReintentar} />;
  if (gastos.length === 0) {
    return (
      <EstadoVacio
        titulo={hayFiltros ? "No hay gastos con estos filtros" : "No hay gastos registrados"}
        descripcion={hayFiltros ? "Prueba cambiando la búsqueda o los filtros." : 'Puedes registrar uno nuevo con el botón "Nuevo gasto".'}
        accionLabel={hayFiltros ? undefined : "Nuevo gasto"}
        onAccion={hayFiltros ? undefined : onNuevo}
      />
    );
  }

  return (
    <div className="fin-grid">
      {gastos.map((g) => (
        <div className="fin-card" key={g.id}>
          <div className="fin-card-header">
            <div>
              <div className="fin-card-titulo">{g.categoria}</div>
              <div className="fin-card-sub">
                {formatFecha(g.fecha)} · <span className={`co-badge ${g.empresa}`}>{g.empresa === "corevex" ? "Corevex" : "Electro"}</span>
              </div>
            </div>
            <span className="fin-card-monto">{soles(g.monto)}</span>
          </div>

          <div className="fin-card-body">
            <div className="fin-card-comprobante">
              {g.tipoComprobante ? (
                <span className={`fin-tag-tipo fin-tag-tipo--${g.tipoComprobante}`}>{TIPO_COMPROBANTE_LABEL[g.tipoComprobante]}</span>
              ) : (
                <span className="fin-tag-tipo fin-tag-tipo--sin" title="Sin tipo de comprobante">—</span>
              )}
              {g.faltantes?.length > 0 && <span className="fin-faltan-chip" title={`Falta: ${g.faltantes.join(", ")}`}>Faltan datos</span>}
            </div>
            {g.rucProveedor && <div><span className="fin-card-label">RUC del proveedor</span><span className="fin-card-ruc">{g.rucProveedor}</span></div>}
            {g.proveedor && <div><span className="fin-card-label">Proveedor</span><span>{g.proveedor}</span></div>}
            {g.trabajador && <div><span className="fin-card-label">Trabajador</span><span>{g.trabajador}</span></div>}
            {g.descripcion && <div><span className="fin-card-label">Descripción</span><span>{g.descripcion}</span></div>}

            {g.archivo ? (
              <BotonVerArchivo className="fin-card-archivo fin-card-archivo--link" url={g.archivoUrl} nombre={g.archivoNombre}>
                Ver comprobante
              </BotonVerArchivo>
            ) : (
              <span className="fin-card-sin-documento">Sin documento</span>
            )}
          </div>

          <div className="fin-card-footer">
            <button className="btn-outline-sm" type="button" onClick={() => onEditar(g)}>Editar</button>
            {/* Eliminar (también borra el comprobante): solo SuperAdmin. */}
            {onEliminar && (
              <button className="icon-btn icon-btn--peligro" type="button" title="Eliminar gasto" aria-label={`Eliminar el gasto N.º ${g.id} de ${g.categoria}`} onClick={() => onEliminar(g)}>
                <IconTrash width={15} height={15} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
