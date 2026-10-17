import { IconEye, IconTrash, IconUpload, IconPlus, IconChevronLeft } from "../icons/Icons";
import { BotonVerArchivo } from "../shared/VisorArchivo";
import { Spinner } from "../shared/Carga";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";

const NOMBRE_EMPRESA_CORTO = { corevex: "Corevex", electro: "Electro" };

// Documento de un curso/EMO: "Ver" si tiene; si no, "Sin documento" y la
// opción de adjuntarlo (es opcional, no se marca en rojo).
function Documento({ item, onAdjuntarArchivo, estadoAdjunto }) {
  const subiendo = estadoAdjunto?.(item.id);
  if (subiendo) {
    return (
      <span className="doc-chip doc-chip--subiendo" role="status">
        <Spinner tamano={13} />
        {subiendo}
      </span>
    );
  }
  if (item.archivo) return <BotonVerArchivo url={item.archivoUrl} nombre={item.archivoNombre} />;
  return (
    <span className="doc-celda">
      <span className="sin-adjuntar">Sin documento</span>
      <label className="doc-chip doc-chip--opcional" title={`Adjuntar foto o PDF del ${item.tipo === "EMO" ? "EMO" : "curso"}`}>
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

function Resumen({ resumen, estadoLabel }) {
  const { cursos, vencidos, porVencer, emo } = resumen;
  return (
    <span className="persona-cursos__resumen">
      <span>
        {cursos} {cursos === 1 ? "curso" : "cursos"}
      </span>
      {vencidos > 0 && (
        <span className="resumen-chip resumen-chip--vencido">
          {vencidos} {vencidos === 1 ? "vencido" : "vencidos"}
        </span>
      )}
      {porVencer > 0 && <span className="resumen-chip resumen-chip--porvencer">{porVencer} por vencer</span>}
      <span className="persona-cursos__emo">
        EMO:{" "}
        {emo ? (
          <span className={`estado ${emo}`}>
            <i />
            {estadoLabel[emo]}
          </span>
        ) : (
          <span className="sin-adjuntar">sin registrar</span>
        )}
      </span>
    </span>
  );
}

function Registro({ item, coincide, mostrarEmpresa, estadoLabel, onEditar, onVerDetalle, onEliminar, onAdjuntarArchivo, estadoAdjunto }) {
  const esCurso = item.tipo === "Curso";
  const historico = item.tipo === "Fotocheck";
  return (
    <li className={`registro-ficha ${coincide ? "registro-ficha--coincide" : ""}`}>
      {coincide && <span className="sr-only">Coincide con la búsqueda. </span>}
      <div className="registro-ficha__cabecera">
        <span className="registro-curso">
          <span className="registro-curso__nombre">{esCurso ? item.nombreCurso || "—" : item.tipo}</span>
          {esCurso && <span className="registro-curso__codigo">{item.codigoCurso || "—"}</span>}
          {item.faltantes?.length > 0 && <span className="rrhh-faltan-chip">Faltan datos</span>}
        </span>
        <span className={`estado ${item.estado}`}>
          <i />
          {estadoLabel[item.estado]}
        </span>
      </div>
      <p className="registro-ficha__fechas">
        <span>Inicio {item.inicio}</span>
        <span>Vence {item.vence}</span>
        {/* La empresa del registro, solo si la persona tiene más de una */}
        {mostrarEmpresa && <span className={`co-badge ${item.empresa}`}>{NOMBRE_EMPRESA_CORTO[item.empresa]}</span>}
      </p>
      <div className="registro-ficha__pie">
        <Documento item={item} onAdjuntarArchivo={onAdjuntarArchivo} estadoAdjunto={estadoAdjunto} />
        <div className="rrhh-mobile-card-acciones">
          <button
            className="btn-outline-sm"
            type="button"
            onClick={() => onEditar(item)}
            disabled={historico}
            title={historico ? "Fotocheck ya no se registra: este registro se conserva como histórico" : undefined}
            aria-label={`Editar ${esCurso ? `el curso ${item.nombreCurso || ""}` : item.tipo}`}
          >
            Editar
          </button>
          <button className="icon-btn" type="button" title="Ver detalle" aria-label="Ver detalle" onClick={() => onVerDetalle(item)}>
            <IconEye />
          </button>
          <button
            className="icon-btn icon-btn--peligro"
            type="button"
            title="Eliminar"
            aria-label={`Eliminar ${esCurso ? `el curso ${item.nombreCurso || item.codigoCurso || ""}` : item.tipo} de ${item.trabajador}`}
            onClick={() => onEliminar(item)}
          >
            <IconTrash />
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * Cursos / EMO agrupados por persona: cada fila muestra su resumen y, al
 * tocarla, la ficha con sus cursos (por vencimiento) y su EMO, más los
 * botones para agregar desde ahí sin volver a elegir a la persona.
 */
export default function CursosPorPersona({
  cargando, error, onReintentar, grupos, hayFiltrosActivos, estadoLabel,
  fichaAbierta, fijarFicha, onNuevo, onAgregar, onEditar, onVerDetalle, onEliminar, onAdjuntarArchivo, estadoAdjunto,
}) {
  if (cargando) return <Loading texto="Cargando cursos y EMO…" />;
  if (error) return <EstadoError error={error} onReintentar={onReintentar} />;
  if (grupos.length === 0) {
    return (
      <EstadoVacio
        titulo={hayFiltrosActivos ? "No hay resultados con estos filtros" : "No hay personal con contrato"}
        descripcion={hayFiltrosActivos ? "Prueba ajustando los filtros de búsqueda." : "Registra primero un contrato en la pestaña Contratos."}
        accionLabel={hayFiltrosActivos ? undefined : "Nuevo registro"}
        onAccion={hayFiltrosActivos ? undefined : onNuevo}
      />
    );
  }

  return (
    <ul className="personas-cursos">
      {grupos.map((g) => {
        const abierta = fichaAbierta(g.dni);
        const fichaId = `ficha-cursos-${g.dni}`;
        // Un EMO por empresa de contrato: "Registrar EMO" mientras falte alguno.
        const emos = g.registros.filter((r) => r.tipo === "EMO").length;
        const tieneEmo = emos >= Math.max(1, g.empresasContrato.length);
        return (
          <li key={g.dni} className={`persona-cursos ${abierta ? "persona-cursos--abierta" : ""}`}>
            <button type="button" className="persona-cursos__cabecera" aria-expanded={abierta} aria-controls={fichaId} onClick={() => fijarFicha(g.dni, !abierta)}>
              <span className="mini-avatar" aria-hidden="true">{g.iniciales}</span>
              <span className="persona-cursos__info">
                <span className="persona-cursos__nombre">{g.nombre}</span>
                <span className="persona-cursos__empresas">
                  {g.empresas.map((e) => (
                    <span key={e} className={`co-badge ${e}`}>{NOMBRE_EMPRESA_CORTO[e]}</span>
                  ))}
                </span>
                <Resumen resumen={g.resumen} estadoLabel={estadoLabel} />
              </span>
              <span className="persona-cursos__flecha" aria-hidden="true">
                <IconChevronLeft width={18} height={18} />
              </span>
            </button>

            {abierta && (
              <div className="persona-cursos__ficha" id={fichaId}>
                {g.tieneContrato ? (
                  <div className="persona-cursos__acciones">
                    <button type="button" className="btn-primary" onClick={() => onAgregar(g, "Curso")}>
                      <IconPlus width={13} height={13} /> Agregar curso
                    </button>
                    {!tieneEmo && (
                      <button type="button" className="btn-outline-sm btn-outline-sm--primario" onClick={() => onAgregar(g, "EMO")}>
                        <IconPlus width={13} height={13} /> Registrar EMO
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="rrhh-faltantes" role="status">
                    {g.nombre} no tiene un contrato registrado, así que no se puede saber a qué empresa corresponden sus cursos. Registra primero su contrato en la pestaña Contratos.
                  </p>
                )}
                {g.registros.length === 0 ? (
                  <p className="persona-cursos__vacio">Todavía no tiene cursos ni EMO registrados.</p>
                ) : (
                  <ul className="registros-ficha">
                    {g.registros.map((item) => (
                      <Registro
                        key={item.id}
                        item={item}
                        coincide={g.coincidencias?.has(item.id)}
                        mostrarEmpresa={g.empresas.length > 1}
                        estadoLabel={estadoLabel}
                        onEditar={onEditar}
                        onVerDetalle={onVerDetalle}
                        onEliminar={onEliminar}
                        onAdjuntarArchivo={onAdjuntarArchivo}
                        estadoAdjunto={estadoAdjunto}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
