import { IconEye, IconTrash, IconUpload, IconPlus, IconChevronLeft } from "../icons/Icons";
import { BotonVerArchivo } from "../shared/VisorArchivo";
import { Spinner } from "../shared/Carga";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";
import { AVATAR, AVISO_FALTAN, DOC_CELDA, ESTADO_PUNTO, ESTADO_RRHH, SIN_ADJUNTAR, TARJETA_ACCIONES } from "./clasesRrhh";
import { CHIP_DOC_OPCIONAL, CHIP_DOC_SUBIENDO } from "../shared/clasesDocumento";
import * as F from "../shared/clasesFicha";

const NOMBRE_EMPRESA_CORTO = { corevex: "Corevex", electro: "Electro" };

// La ficha es compartida con Operaciones > Asignaciones (shared/clasesFicha.js).
// Acá va lo que solo usa RRHH.
const EMPRESAS = "flex flex-wrap gap-1.5";
const EMO = "inline-flex items-center gap-1";
// "Agregar curso" (.btn-primary) y "Registrar EMO" (.btn-outline-sm): mismo
// alto y letra, ícono y texto con 6px entre sí.
const ACCIONES = "flex flex-wrap gap-2";
const ACCION = "inline-flex min-h-11 items-center gap-1.5 text-[13.5px]";
const VACIO = "m-0 text-sm text-muted";
const CURSO = "inline-flex min-w-0 flex-col items-start gap-0.5";
const CURSO_NOMBRE = "font-semibold text-text wrap-anywhere";
const CURSO_CODIGO = "[font-family:var(--font-mono)] text-xs text-muted wrap-anywhere";
const FALTAN = "rounded-[999px] bg-volt-tint px-2 py-px text-xs font-semibold text-volt-dark";
const PIE = "flex flex-wrap items-center justify-between gap-2";

// Documento de un curso/EMO: "Ver" si tiene; si no, "Sin documento" y la
// opción de adjuntarlo (es opcional, no se marca en rojo).
function Documento({ item, onAdjuntarArchivo, estadoAdjunto }) {
  const subiendo = estadoAdjunto?.(item.id);
  if (subiendo) {
    return (
      <span className={CHIP_DOC_SUBIENDO} role="status">
        <Spinner tamano={13} />
        {subiendo}
      </span>
    );
  }
  if (item.archivo) return <BotonVerArchivo url={item.archivoUrl} nombre={item.archivoNombre} />;
  return (
    <span className={DOC_CELDA}>
      <span className={SIN_ADJUNTAR}>Sin documento</span>
      <label className={CHIP_DOC_OPCIONAL} title={`Adjuntar foto o PDF del ${item.tipo === "EMO" ? "EMO" : "curso"}`}>
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
    <span className={F.RESUMEN}>
      <span>
        {cursos} {cursos === 1 ? "curso" : "cursos"}
      </span>
      {vencidos > 0 && (
        <span className={F.CHIP_VENCIDO}>
          {vencidos} {vencidos === 1 ? "vencido" : "vencidos"}
        </span>
      )}
      {porVencer > 0 && <span className={F.CHIP_POR_VENCER}>{porVencer} por vencer</span>}
      <span className={EMO}>
        EMO:{" "}
        {emo ? (
          <span className={ESTADO_RRHH[emo]}>
            <i className={ESTADO_PUNTO} />
            {estadoLabel[emo]}
          </span>
        ) : (
          <span className={SIN_ADJUNTAR}>sin registrar</span>
        )}
      </span>
    </span>
  );
}

function Registro({ item, coincide, mostrarEmpresa, estadoLabel, onEditar, onVerDetalle, onEliminar, onAdjuntarArchivo, estadoAdjunto }) {
  const esCurso = item.tipo === "Curso";
  const historico = item.tipo === "Fotocheck";
  return (
    <li className={coincide ? F.REGISTRO_COINCIDE : F.REGISTRO_NORMAL}>
      {coincide && <span className="sr-only">Coincide con la búsqueda. </span>}
      <div className={F.REGISTRO_CABECERA}>
        <span className={CURSO}>
          <span className={CURSO_NOMBRE}>{esCurso ? item.nombreCurso || "—" : item.tipo}</span>
          {esCurso && <span className={CURSO_CODIGO}>{item.codigoCurso || "—"}</span>}
          {item.faltantes?.length > 0 && <span className={FALTAN}>Faltan datos</span>}
        </span>
        <span className={ESTADO_RRHH[item.estado]}>
          <i className={ESTADO_PUNTO} />
          {estadoLabel[item.estado]}
        </span>
      </div>
      <p className={F.REGISTRO_FECHAS}>
        <span>Inicio {item.inicio}</span>
        <span>Vence {item.vence}</span>
        {/* La empresa del registro, solo si la persona tiene más de una */}
        {mostrarEmpresa && <span className={`co-badge ${item.empresa}`}>{NOMBRE_EMPRESA_CORTO[item.empresa]}</span>}
      </p>
      <div className={PIE}>
        <Documento item={item} onAdjuntarArchivo={onAdjuntarArchivo} estadoAdjunto={estadoAdjunto} />
        <div className={TARJETA_ACCIONES}>
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
    <ul className={F.FICHAS}>
      {grupos.map((g) => {
        const abierta = fichaAbierta(g.dni);
        const fichaId = `ficha-cursos-${g.dni}`;
        // Un EMO por empresa de contrato: "Registrar EMO" mientras falte alguno.
        const emos = g.registros.filter((r) => r.tipo === "EMO").length;
        const tieneEmo = emos >= Math.max(1, g.empresasContrato.length);
        return (
          <li key={g.dni} className={abierta ? F.FICHA_ABIERTA : F.FICHA_CERRADA}>
            <button type="button" className={F.CABECERA} aria-expanded={abierta} aria-controls={fichaId} onClick={() => fijarFicha(g.dni, !abierta)}>
              <span className={AVATAR} aria-hidden="true">{g.iniciales}</span>
              <span className={F.INFO}>
                <span className={F.NOMBRE}>{g.nombre}</span>
                <span className={EMPRESAS}>
                  {g.empresas.map((e) => (
                    <span key={e} className={`co-badge ${e}`}>{NOMBRE_EMPRESA_CORTO[e]}</span>
                  ))}
                </span>
                <Resumen resumen={g.resumen} estadoLabel={estadoLabel} />
              </span>
              <span className={abierta ? F.FLECHA_ABIERTA : F.FLECHA_CERRADA} aria-hidden="true">
                <IconChevronLeft className={abierta ? F.FLECHA_ICONO_ABIERTA : F.FLECHA_ICONO_CERRADA} width={18} height={18} />
              </span>
            </button>

            {abierta && (
              <div className={F.DETALLE} id={fichaId}>
                {g.tieneContrato ? (
                  <div className={ACCIONES}>
                    <button type="button" className={`btn-primary ${ACCION}`} onClick={() => onAgregar(g, "Curso")}>
                      <IconPlus width={13} height={13} /> Agregar curso
                    </button>
                    {!tieneEmo && (
                      <button type="button" className={`btn-outline-sm btn-outline-sm--primario ${ACCION}`} onClick={() => onAgregar(g, "EMO")}>
                        <IconPlus width={13} height={13} /> Registrar EMO
                      </button>
                    )}
                  </div>
                ) : (
                  <p className={AVISO_FALTAN} role="status">
                    {g.nombre} no tiene un contrato registrado, así que no se puede saber a qué empresa corresponden sus cursos. Registra primero su contrato en la pestaña Contratos.
                  </p>
                )}
                {g.registros.length === 0 ? (
                  <p className={VACIO}>Todavía no tiene cursos ni EMO registrados.</p>
                ) : (
                  <ul className={F.REGISTROS}>
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
