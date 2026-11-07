import { IconTrash } from "../icons/Icons";
import { BotonVerArchivo } from "../shared/VisorArchivo";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";
import { soles, formatFecha, TIPO_COMPROBANTE_LABEL } from "./finanzasUtils";
import { ARCHIVO_VER, CABECERA, CABECERA_TEXTO, COMPROBANTE, CUERPO, ETIQUETA, FALTAN, GRILLA, MONTO, PIE, RUC, SIN_DOCUMENTO, SUBTITULO, TARJETA, TIPO_COMPROBANTE, TITULO } from "./clasesFinanzas";

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
    <div className={GRILLA}>
      {gastos.map((g) => (
        <div className={TARJETA} key={g.id}>
          <div className={CABECERA}>
            <div className={CABECERA_TEXTO}>
              <div className={TITULO}>{g.categoria}</div>
              <div className={SUBTITULO}>
                {formatFecha(g.fecha)} · <span className={`co-badge ${g.empresa}`}>{g.empresa === "corevex" ? "Corevex" : "Electro"}</span>
              </div>
            </div>
            <span className={MONTO}>{soles(g.monto)}</span>
          </div>

          <div className={CUERPO}>
            <div className={COMPROBANTE}>
              {g.tipoComprobante ? (
                <span className={TIPO_COMPROBANTE[g.tipoComprobante]}>{TIPO_COMPROBANTE_LABEL[g.tipoComprobante]}</span>
              ) : (
                <span className={TIPO_COMPROBANTE.sin} title="Sin tipo de comprobante">—</span>
              )}
              {g.faltantes?.length > 0 && <span className={FALTAN} title={`Falta: ${g.faltantes.join(", ")}`}>Faltan datos</span>}
            </div>
            {g.rucProveedor && <div><span className={ETIQUETA}>RUC del proveedor</span><span className={RUC}>{g.rucProveedor}</span></div>}
            {g.proveedor && <div><span className={ETIQUETA}>Proveedor</span><span>{g.proveedor}</span></div>}
            {g.trabajador && <div><span className={ETIQUETA}>Trabajador</span><span>{g.trabajador}</span></div>}
            {g.descripcion && <div><span className={ETIQUETA}>Descripción</span><span>{g.descripcion}</span></div>}

            {g.archivo ? (
              <BotonVerArchivo className={ARCHIVO_VER} url={g.archivoUrl} nombre={g.archivoNombre}>
                Ver comprobante
              </BotonVerArchivo>
            ) : (
              <span className={SIN_DOCUMENTO}>Sin documento</span>
            )}
          </div>

          <div className={PIE}>
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
