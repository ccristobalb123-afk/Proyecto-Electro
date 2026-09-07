import { IconFile, IconEye, IconUpload } from "../icons/Icons";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";

export default function TablaRrhh({ cargando, error, onReintentar, items, tab, estadoLabel, hayFiltrosActivos, onNuevo, onVerDetalle, onAdjuntarArchivo }) {
  if (cargando) return <Loading texto="Cargando..." />;
  if (error) return <EstadoError error={error} onReintentar={onReintentar} />;

  if (items.length === 0) {
    return (
      <EstadoVacio
        titulo={hayFiltrosActivos ? "No hay resultados con estos filtros" : tab === "contratos" ? "No hay contratos registrados" : "No hay cursos ni certificaciones registrados"}
        descripcion={hayFiltrosActivos ? "Prueba ajustando los filtros de búsqueda." : undefined}
        accionLabel={hayFiltrosActivos ? undefined : tab === "contratos" ? "Nuevo contrato" : "Nuevo registro"}
        onAccion={onNuevo}
      />
    );
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Trabajador</th>
            <th>Empresa</th>
            <th>Tipo</th>
            <th>Vence</th>
            {tab === "contratos" && <th>Documento</th>}
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="worker">
                  <div className="mini-avatar">{item.iniciales}</div>
                  <span>{item.trabajador}</span>
                </div>
              </td>
              <td>
                <span className={`co-badge ${item.empresa}`}>
                  {item.empresa === "corevex" ? "Corevex" : "Electro"}
                </span>
              </td>
              <td>{item.tipo}</td>
              <td className="code">{item.vence}</td>
              {tab === "contratos" && (
                <td>
                  {item.archivo ? (
                    <button className="doc-chip" type="button">
                      <IconFile width={13} height={13} />
                      Ver PDF
                    </button>
                  ) : (
                    <label className="doc-chip doc-chip--pendiente" title="Adjuntar el documento del contrato">
                      <IconUpload width={13} height={13} />
                      Adjuntar
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const archivo = e.target.files?.[0];
                          if (archivo) onAdjuntarArchivo(item, archivo);
                        }}
                      />
                    </label>
                  )}
                </td>
              )}
              <td>
                <span className={`estado ${item.estado}`}>
                  <i />
                  {estadoLabel[item.estado]}
                </span>
              </td>
              <td>
                <button className="icon-btn" type="button" title="Ver detalle" onClick={() => onVerDetalle(item)}>
                  <IconEye />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
