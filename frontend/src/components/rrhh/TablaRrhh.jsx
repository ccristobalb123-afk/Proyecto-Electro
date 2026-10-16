import { IconEye, IconUpload, IconTrash } from "../icons/Icons";
import { BotonVerArchivo } from "../shared/VisorArchivo";
import { Spinner } from "../shared/Carga";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";

// "Ver PDF / Ver imagen" si ya tiene archivo, o "Adjuntar" si no —
// igual en Contratos y en Cursos / EMO.
function CeldaDocumento({ item, tab, onAdjuntarArchivo, estadoAdjunto }) {
  const subiendo = estadoAdjunto?.(item.id);
  if (subiendo) {
    return (
      <span className="doc-chip doc-chip--subiendo" role="status">
        <Spinner tamano={13} />
        {subiendo}
      </span>
    );
  }
  if (item.archivo) {
    return <BotonVerArchivo url={item.archivoUrl} nombre={item.archivoNombre} />;
  }
  const titulo = tab === "contratos" ? "Adjuntar el documento del contrato" : `Adjuntar foto o PDF del ${item.tipo.toLowerCase()}`;
  // En Cursos / EMO el documento es opcional: "Sin documento" y la opción
  // de adjuntar, sin el aviso en rojo de algo que falta.
  const opcional = tab === "cursos";
  return (
    <span className="doc-celda">
      {opcional && <span className="sin-adjuntar">Sin documento</span>}
    <label className={`doc-chip ${opcional ? "doc-chip--opcional" : "doc-chip--pendiente"}`} title={titulo}>
      <IconUpload width={13} height={13} />
      Adjuntar
      <input
        type="file"
        accept=".pdf,image/*"
        className="input-oculto"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          e.target.value = "";
          if (archivo) onAdjuntarArchivo(item, archivo);
        }}
      />
    </label>
    </span>
  );
}

// "Curso" + nombre y código, o "EMO". Un curso anterior sin código o
// nombre se muestra con "—" y el aviso "Faltan datos".
function DescripcionRegistro({ item }) {
  if (item.tipo !== "Curso") return item.tipo;
  return (
    <span className="registro-curso">
      <span className="registro-curso__nombre">{item.nombreCurso || "—"}</span>
      <span className="registro-curso__codigo">{item.codigoCurso || "—"}</span>
      {item.faltantes?.length > 0 && <span className="rrhh-faltan-chip">Faltan datos</span>}
    </span>
  );
}

export default function TablaRrhh({ cargando, error, onReintentar, items, tab, estadoLabel, hayFiltrosActivos, onNuevo, onVerDetalle, onEditar, onEliminar, onAdjuntarArchivo, estadoAdjunto }) {
  if (cargando) return <Loading texto={tab === "contratos" ? "Cargando contratos…" : "Cargando cursos y EMO…"} />;
  if (error) return <EstadoError error={error} onReintentar={onReintentar} />;

  if (items.length === 0) {
    return (
      <EstadoVacio
        titulo={hayFiltrosActivos ? "No hay resultados con estos filtros" : tab === "contratos" ? "No hay contratos registrados" : "No hay cursos ni EMO registrados"}
        descripcion={hayFiltrosActivos ? "Prueba ajustando los filtros de búsqueda." : undefined}
        accionLabel={hayFiltrosActivos ? undefined : tab === "contratos" ? "Nuevo contrato" : "Nuevo registro"}
        onAccion={onNuevo}
      />
    );
  }

  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Trabajador</th>
              <th scope="col">Empresa</th>
              <th scope="col">{tab === "cursos" ? "Registro" : "Tipo"}</th>
              {tab === "cursos" && <th scope="col">Inicio</th>}
              <th scope="col">Vence</th>
              <th scope="col">Documento</th>
              <th scope="col">Estado</th>
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
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
                <td>{tab === "cursos" ? <DescripcionRegistro item={item} /> : item.tipo}</td>
                {tab === "cursos" && <td className="code">{item.inicio}</td>}
                <td className="code">{item.vence}</td>
                <td>
                  <CeldaDocumento item={item} tab={tab} onAdjuntarArchivo={onAdjuntarArchivo} estadoAdjunto={estadoAdjunto} />
                </td>
                <td>
                  <span className={`estado ${item.estado}`}>
                    <i />
                    {estadoLabel[item.estado]}
                  </span>
                </td>
                <td>
                  <div className="rrhh-tabla-acciones">
                    <button
                  className="btn-outline-sm"
                  type="button"
                  onClick={() => onEditar(item)}
                  disabled={item.tipo === "Fotocheck"}
                  title={item.tipo === "Fotocheck" ? "Fotocheck ya no se registra: este registro se conserva como histórico" : undefined}
                >
                  Editar
                </button>
                    <button className="icon-btn" type="button" title="Ver detalle" onClick={() => onVerDetalle(item)}>
                      <IconEye />
                    </button>
                    <button className="icon-btn icon-btn--peligro" type="button" title="Eliminar" aria-label={`Eliminar registro de ${item.trabajador}`} onClick={() => onEliminar(item)}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Misma información que la tabla de arriba, en formato tarjeta —
          la tabla se oculta en pantallas de celular (ver responsive.css)
          y esta lista de tarjetas la reemplaza, porque una tabla de 6-7
          columnas con scroll horizontal es incómoda de leer en un celular. */}
      <div className="rrhh-cards-mobile">
        {items.map((item) => (
          <div className="rrhh-mobile-card" key={item.id}>
            <div className="rrhh-mobile-card-top">
              <div className="worker">
                <div className="mini-avatar">{item.iniciales}</div>
                <span>{item.trabajador}</span>
              </div>
            </div>

            <div className="rrhh-mobile-card-badges">
              <span className={`co-badge ${item.empresa}`}>
                {item.empresa === "corevex" ? "Corevex" : "Electro"}
              </span>
              <span className={`estado ${item.estado}`}>
                <i />
                {estadoLabel[item.estado]}
              </span>
            </div>

            <div className="rrhh-mobile-card-datos">
              <div className={tab === "cursos" ? "rrhh-mobile-dato-ancho" : undefined}>
                <span className="rrhh-mobile-label">{tab === "cursos" ? "Registro" : "Tipo"}</span>
                <p>{tab === "cursos" ? <DescripcionRegistro item={item} /> : item.tipo}</p>
              </div>
              {tab === "cursos" && (
                <div>
                  <span className="rrhh-mobile-label">Inicio</span>
                  <p>{item.inicio}</p>
                </div>
              )}
              <div>
                <span className="rrhh-mobile-label">Vence</span>
                <p>{item.vence}</p>
              </div>
            </div>

            {/* Documento y acciones al pie: arriba las 3 acciones le dejaban
                al nombre del trabajador ~70px en un celular de 360px. */}
            <div className="rrhh-mobile-card-doc">
              <CeldaDocumento item={item} tab={tab} onAdjuntarArchivo={onAdjuntarArchivo} estadoAdjunto={estadoAdjunto} />
              <div className="rrhh-mobile-card-acciones">
                <button
                  className="btn-outline-sm"
                  type="button"
                  onClick={() => onEditar(item)}
                  disabled={item.tipo === "Fotocheck"}
                  title={item.tipo === "Fotocheck" ? "Fotocheck ya no se registra: este registro se conserva como histórico" : undefined}
                >
                  Editar
                </button>
                <button className="icon-btn" type="button" title="Ver detalle" aria-label="Ver detalle" onClick={() => onVerDetalle(item)}>
                  <IconEye />
                </button>
                <button className="icon-btn icon-btn--peligro" type="button" title="Eliminar" aria-label={`Eliminar registro de ${item.trabajador}`} onClick={() => onEliminar(item)}>
                  <IconTrash />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
