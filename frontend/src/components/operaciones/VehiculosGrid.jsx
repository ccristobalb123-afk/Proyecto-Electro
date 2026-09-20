import { IconPlus, IconEye, IconFile, IconTrash } from "../icons/Icons";
import { ARCHIVOS_BASE_URL } from "../../services/apiClient";
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
  if (cargando) return <Loading texto="Cargando vehículos..." />;
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
                <IconPlus width={13} height={13} /> Agregar documento
              </button>
              <button className="icon-btn" type="button" title="Ver historial" onClick={() => onVerHistorial(v)}>
                <IconEye />
              </button>
              <button className="btn-outline-sm" type="button" onClick={() => onEditar(v)}>Editar</button>
              <button className="icon-btn" type="button" title="Eliminar vehículo" onClick={() => onEliminar(v)}>
                <IconTrash />
              </button>
            </div>
          </div>

          {v.cuadrilla && <div className="vehiculo-card-cuadrilla">{v.cuadrilla}</div>}

          <div className="vehiculo-docs-list">
            {v.documentos.map((d) => {
              const fechaTexto =
                d.dias === null
                  ? null
                  : (() => {
                      const fecha = new Date();
                      fecha.setDate(fecha.getDate() + d.dias);
                      return fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
                    })();
              return (
                <div className="vehiculo-doc-item" key={d.id}>
                  {d.archivo ? (
                    <a className="vehiculo-doc-nombre vehiculo-doc-nombre--link" href={`${ARCHIVOS_BASE_URL}${d.archivoUrl}`} target="_blank" rel="noreferrer">
                      {d.tipo}
                    </a>
                  ) : (
                    <span className="vehiculo-doc-nombre">{d.tipo}</span>
                  )}
                  <span className={`vehiculo-doc-vence vence-${d.estado}`}>
                    {fechaTexto ? `Vence: ${fechaTexto}` : "Sin fecha aún"}
                  </span>
                  <button className="icon-btn" type="button" title="Adjuntar o ver documento" onClick={() => onAbrirDocumentos(v)}>
                    <IconFile width={14} height={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
