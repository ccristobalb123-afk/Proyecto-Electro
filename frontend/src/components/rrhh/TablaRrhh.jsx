import { IconEye, IconUpload, IconTrash } from "../icons/Icons";
import { BotonVerArchivo } from "../shared/VisorArchivo";
import { Spinner } from "../shared/Carga";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";
import { AVATAR, CELDA, CELDA_CODIGO, DOC_PENDIENTE, DOC_SUBIENDO, ESTADO_PUNTO, ESTADO_RRHH, ETIQUETA, FILA, TABLA, TABLA_ACCIONES, TARJETA, TARJETA_ACCIONES, TARJETA_ARRIBA, TARJETA_DATOS, TARJETA_DOCUMENTO, TARJETA_ETIQUETAS, TARJETA_VALOR, TARJETAS, TH, TRABAJADOR, TRABAJADOR_NOMBRE_TARJETA, TRABAJADOR_TARJETA } from "./clasesRrhh";

// "Ver PDF / Ver imagen" si ya tiene archivo, o "Adjuntar" si no —
// igual en Contratos y en Cursos / EMO.
function CeldaDocumento({ item, tab, onAdjuntarArchivo, estadoAdjunto }) {
  const subiendo = estadoAdjunto?.(item.id);
  if (subiendo) {
    return (
      <span className={DOC_SUBIENDO} role="status">
        <Spinner tamano={13} />
        {subiendo}
      </span>
    );
  }
  if (item.archivo) {
    return <BotonVerArchivo url={item.archivoUrl} nombre={item.archivoNombre} />;
  }
  const titulo = tab === "contratos" ? "Adjuntar el documento del contrato" : `Adjuntar foto o PDF del ${item.tipo.toLowerCase()}`;
  return (
    <label className={DOC_PENDIENTE} title={titulo}>
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
        <table className={TABLA}>
          <thead>
            <tr>
              <th className={TH} scope="col">Trabajador</th>
              <th className={TH} scope="col">Empresa</th>
              <th className={TH} scope="col">Tipo</th>
              <th className={TH} scope="col">Vence</th>
              <th className={TH} scope="col">Documento</th>
              <th className={TH} scope="col">Estado</th>
              <th className={TH} scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr className={FILA} key={item.id}>
                <td className={CELDA}>
                  <div className={TRABAJADOR}>
                    <div className={AVATAR}>{item.iniciales}</div>
                    <span>{item.trabajador}</span>
                  </div>
                </td>
                <td className={CELDA}>
                  <span className={`co-badge ${item.empresa}`}>
                    {item.empresa === "corevex" ? "Corevex" : "Electro"}
                  </span>
                </td>
                <td className={CELDA}>{item.tipo}</td>
                <td className={CELDA_CODIGO}>{item.vence}</td>
                <td className={CELDA}>
                  <CeldaDocumento item={item} tab={tab} onAdjuntarArchivo={onAdjuntarArchivo} estadoAdjunto={estadoAdjunto} />
                </td>
                <td className={CELDA}>
                  <span className={ESTADO_RRHH[item.estado]}>
                    <i className={ESTADO_PUNTO} />
                    {estadoLabel[item.estado]}
                  </span>
                </td>
                <td className={CELDA}>
                  <div className={TABLA_ACCIONES}>
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
      <div className={TARJETAS}>
        {items.map((item) => (
          <div className={TARJETA} key={item.id}>
            <div className={TARJETA_ARRIBA}>
              <div className={TRABAJADOR_TARJETA}>
                <div className={AVATAR}>{item.iniciales}</div>
                <span className={TRABAJADOR_NOMBRE_TARJETA}>{item.trabajador}</span>
              </div>
            </div>

            <div className={TARJETA_ETIQUETAS}>
              <span className={`co-badge ${item.empresa}`}>
                {item.empresa === "corevex" ? "Corevex" : "Electro"}
              </span>
              <span className={ESTADO_RRHH[item.estado]}>
                <i className={ESTADO_PUNTO} />
                {estadoLabel[item.estado]}
              </span>
            </div>

            <div className={TARJETA_DATOS}>
              <div>
                <span className={ETIQUETA}>Tipo</span>
                <p className={TARJETA_VALOR}>{item.tipo}</p>
              </div>
              <div>
                <span className={ETIQUETA}>Vence</span>
                <p className={TARJETA_VALOR}>{item.vence}</p>
              </div>
            </div>

            {/* Documento y acciones al pie: arriba las 3 acciones le dejaban
                al nombre del trabajador ~70px en un celular de 360px. */}
            <div className={TARJETA_DOCUMENTO}>
              <CeldaDocumento item={item} tab={tab} onAdjuntarArchivo={onAdjuntarArchivo} estadoAdjunto={estadoAdjunto} />
              <div className={TARJETA_ACCIONES}>
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
