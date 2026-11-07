import { IconEye, IconFile, IconTrash } from "../icons/Icons";
import { BotonVerArchivo } from "../shared/VisorArchivo";
import EstadoDocumento from "./EstadoDocumento";
import { fechaCorta } from "../../services/vehiculosService";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";

// 1 columna; 2 desde 992px. "vehiculos-grid" queda como gancho:
// responsive.css (una columna en celular).
const GRILLA = "vehiculos-grid grid grid-cols-[minmax(0,1fr)] gap-4 min-[992px]:grid-cols-2";
// Mismo borde que las tarjetas de equipo (--borde-tarjeta, en tokens.css); el
// relleno lateral descuenta lo que crece ese borde (--borde-tarjeta-extra).
const TARJETA = `flex flex-col rounded-lg [border:var(--borde-tarjeta)] [background:var(--card)] [box-shadow:var(--shadow-sm)]
  px-[calc(20px-var(--borde-tarjeta-extra))] py-[18px] max-md:px-[calc(var(--space-4)-var(--borde-tarjeta-extra))] max-md:py-4`;
const ARRIBA = "flex flex-wrap items-center justify-between gap-2.5";
const TITULO = "flex flex-wrap items-center gap-2.5";
const PLACA = "[font-family:var(--font-mono)] text-[16px] font-bold tracking-[0.02em]";
const TIPO_UNIDAD = "co-badge bg-volt-tint text-volt-dark";
// En celular las acciones pasan a su propia fila a todo el ancho, en la
// cuadrícula compartida de acciones de tarjeta ("vehiculo-card-top-actions",
// responsive.css).
const ACCIONES = "vehiculo-card-top-actions flex flex-wrap items-center gap-2 max-md:w-full";
const CUADRILLA = "mt-1.5 text-[12.5px] text-muted";
const DOCUMENTOS = "mt-3.5 border-t border-t-border";
// Cada documento: línea punteada debajo, salvo el último.
const SEPARADOR = "[border-bottom:1px_dashed_var(--border)] py-[11px] last:[border-bottom:none]";
const DOCUMENTO = `flex flex-col gap-1 ${SEPARADOR}`;
const DOCUMENTO_ANTERIOR = `flex flex-row flex-wrap items-baseline justify-between gap-1 ${SEPARADOR}`;
// En celular el estado va siempre debajo del nombre.
const PRINCIPAL = "flex flex-wrap items-center justify-between gap-2 max-md:flex-col max-md:items-start max-md:gap-1";
const NOMBRE = "min-w-0 text-[13.5px] font-semibold wrap-anywhere";
// Nombre con archivo (BotonVerArchivo): letra y color con [&&]: para ganarle a
// las clases del botón. "vehiculo-doc-nombre--link" queda como gancho:
// responsive.css (subrayado continuo y 44px táctiles en celular).
const NOMBRE_ENLACE = `vehiculo-doc-nombre--link min-w-0 cursor-pointer [&&]:text-[13.5px] [&&]:font-semibold [&&]:text-link underline decoration-dotted
  underline-offset-3 wrap-anywhere [&&]:hover:text-link-hover`;
const VENCE = "text-xs text-muted tabular-nums";
const VACIO = "mx-0 mt-3 mb-0 text-sm text-muted";
const ANTERIORES = "mt-2 border-t border-t-border pt-2";
const ANTERIORES_TITULO = "block text-xs font-semibold uppercase tracking-[0.05em] text-muted-2";

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
    <div className={GRILLA}>
      {vehiculos.map((v) => (
        <div key={v.id} className={TARJETA}>
          <div className={ARRIBA}>
            <div className={TITULO}>
              <span className={PLACA}>{v.placa}</span>
              <span className={`co-badge ${v.empresaDueña}`}>{v.empresaDueña === "corevex" ? "COREVEXSAC" : "ELECTROSAC"}</span>
              <span className={TIPO_UNIDAD}>{v.tipoUnidad}</span>
            </div>
            <div className={ACCIONES}>
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

          {v.cuadrilla && <div className={CUADRILLA}>{v.cuadrilla}</div>}

          <div className={DOCUMENTOS}>
            {v.documentos.length === 0 && (
              <p className={VACIO}>Sin documentos marcados. Usa “Editar” para indicar cuáles tiene este vehículo.</p>
            )}
            {v.documentos.map((d) => (
              <div className={DOCUMENTO} key={d.id}>
                <div className={PRINCIPAL}>
                  {d.archivo ? (
                    <BotonVerArchivo className={NOMBRE_ENLACE} url={d.archivoUrl} nombre={d.archivoNombre} icono={false}>
                      {d.nombre}
                    </BotonVerArchivo>
                  ) : (
                    <span className={NOMBRE}>{d.nombre}</span>
                  )}
                  <EstadoDocumento documento={d} />
                </div>
                <span className={VENCE}>
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
              <div className={ANTERIORES}>
                <span className={ANTERIORES_TITULO}>Documentos del sistema anterior</span>
                {v.documentosAnteriores.map((d) => (
                  <div className={DOCUMENTO_ANTERIOR} key={d.id}>
                    {d.archivo ? (
                      <BotonVerArchivo className={NOMBRE_ENLACE} url={d.archivoUrl} nombre={d.archivoNombre} icono={false}>
                        {d.nombre}
                      </BotonVerArchivo>
                    ) : (
                      <span className={NOMBRE}>{d.nombre}</span>
                    )}
                    <span className={VENCE}>{d.fechaVencimiento ? `Vence ${fechaCorta(d.fechaVencimiento)}` : "Sin datos"}</span>
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
