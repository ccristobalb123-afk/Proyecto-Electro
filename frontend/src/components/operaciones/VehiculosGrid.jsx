import { IconEye, IconFile, IconTrash } from "../icons/Icons";
import { BotonVerArchivo } from "../shared/VisorArchivo";
import EstadoDocumento from "./EstadoDocumento";
import { fechaCorta } from "../../services/vehiculosService";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";

export default function VehiculosGrid({
  cargando,
  error,
  onReintentar,
  vehiculos,
  hayFiltrosActivos,
  onNuevo,
  onAbrirDocumentos,
  onVerHistorial,
  onEditar,
  onEliminar,
}) {
  if (cargando) return <Loading texto="Cargando vehículos…" />;
  if (error) return <EstadoError error={error} onReintentar={onReintentar} />;

  if (vehiculos.length === 0) {
    return (
      <EstadoVacio
        titulo={hayFiltrosActivos ? "No hay vehículos que coincidan con el filtro" : "No hay vehículos registrados todavía"}
        descripcion={hayFiltrosActivos ? "Prueba ajustando los filtros." : undefined}
        accionLabel={hayFiltrosActivos ? undefined : "Nuevo vehículo"}
        onAccion={onNuevo}
      />
    );
  }

  return (
    <div className="vehiculos-grid">
      {vehiculos.map((v) => (
        <div key={v.id} className="vehiculo-card">
          <div className="vehiculo-card-top">
            <div className="vehiculo-card-titulo">
              <span className="vehiculo-placa">{v.placa}</span>
              <span className={`co-badge ${v.empresaDueña}`}>{v.empresaDueña === "corevex" ? "COREVEXSAC" : "ELECTROSAC"}</span>
              <span className="co-badge tipo">{v.tipoUnidad}</span>
            </div>
            <div className="vehiculo-card-top-actions">
              <button className="btn-outline-sm" type="button" onClick={() => onAbrirDocumentos(v)}>
                <IconFile width={13} height={13} /> Documentos
              </button>
              <button className="icon-btn" type="button" title="Ver historial" onClick={() => onVerHistorial(v)}>
                <IconEye />
              </button>
              <button className="btn-outline-sm" type="button" onClick={() => onEditar(v)}>Editar</button>
              <button className="icon-btn icon-btn--peligro" type="button" title="Eliminar vehículo" aria-label={`Eliminar el vehículo ${v.placa}`} onClick={() => onEliminar(v)}>
                <IconTrash />
              </button>
            </div>
          </div>

          {v.cuadrilla && <div className="vehiculo-card-cuadrilla">{v.cuadrilla}</div>}

          <div className="vehiculo-docs-list">
            {v.documentos.length === 0 && (
              <p className="vehiculo-docs-vacio">Sin documentos marcados. Usa “Editar” para indicar cuáles tiene este vehículo.</p>
            )}
            {v.documentos.map((d) => (
              <div className="vehiculo-doc-item" key={d.id}>
                <div className="vehiculo-doc-principal">
                  {d.archivo ? (
                    <BotonVerArchivo className="vehiculo-doc-nombre vehiculo-doc-nombre--link" url={d.archivoUrl} nombre={d.archivoNombre} icono={false}>
                      {d.nombre}
                    </BotonVerArchivo>
                  ) : (
                    <span className="vehiculo-doc-nombre">{d.nombre}</span>
                  )}
                  <EstadoDocumento documento={d} />
                </div>
                <span className="vehiculo-doc-vence">
                  {d.fechaVencimiento
                    ? `Vence ${fechaCorta(d.fechaVencimiento)} · aviso ${d.diasAnticipacion} días antes`
                    : d.estado === "novence"
                      ? "Sin vencimiento"
                      : "Falta registrar el vencimiento"}
                  {!d.archivo && " · sin archivo"}
                </span>
              </div>
            ))}

            {v.documentosAnteriores.length > 0 && (
              <div className="vehiculo-docs-anteriores">
                <span className="vehiculo-docs-anteriores__titulo">Documentos del sistema anterior</span>
                {v.documentosAnteriores.map((d) => (
                  <div className="vehiculo-doc-item vehiculo-doc-item--anterior" key={d.id}>
                    {d.archivo ? (
                      <BotonVerArchivo className="vehiculo-doc-nombre vehiculo-doc-nombre--link" url={d.archivoUrl} nombre={d.archivoNombre} icono={false}>
                        {d.nombre}
                      </BotonVerArchivo>
                    ) : (
                      <span className="vehiculo-doc-nombre">{d.nombre}</span>
                    )}
                    <span className="vehiculo-doc-vence">{d.fechaVencimiento ? `Vence ${fechaCorta(d.fechaVencimiento)}` : "Sin datos"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
