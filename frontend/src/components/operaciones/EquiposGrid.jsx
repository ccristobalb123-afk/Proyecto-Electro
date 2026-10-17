import { useState } from "react";
import { IconEye, IconTrash, IconCamera, IconTruck, IconUser } from "../icons/Icons";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";
import { Spinner } from "../shared/Carga";
import Lightbox from "../shared/Lightbox";

import { ESTADOS_EQUIPO as ESTADOS } from "../../services/equiposService";
import { CAMPOS_EQUIPO } from "./camposEquipo";
import "./Asignacion.css";

// Datos de la tarjeta según el tipo (las fechas de inspección van aparte,
// y el campo que identifica al equipo ya está en la cabecera).
function camposDeLaTarjeta(eq, tipo) {
  if (!tipo || tipo.antigua) return Object.entries(eq.camposValores || {});
  const valor = (c) => (c === "fechaFabricacion" ? eq.fechaFabricacion : eq[c]);
  return tipo.campos
    .filter((c) => c !== tipo.identificador && c !== "fechaInspeccion" && c !== "fechaVencimiento")
    .map((c) => [CAMPOS_EQUIPO[c].etiqueta, valor(c) ?? "—"]);
}

export default function EquiposGrid({
  cargando,
  error,
  onReintentar,
  equiposPorCategoria,
  tipos = [],
  hayFiltrosActivos,
  onNuevo,
  onInspeccionar,
  onDevolver,
  onReasignar,
  onVerHistorial,
  onDarBaja,
  onCambiarEstado,
  onEditarFotos,
  onEditar,
  onEliminar,
  equipoOcupado,
}) {
  const [fotoMaximizada, setFotoMaximizada] = useState(null);

  if (cargando) return <Loading texto="Cargando equipos…" />;
  if (error) return <EstadoError error={error} onReintentar={onReintentar} />;

  return (
    <div className="equipos-por-categoria">
      {equiposPorCategoria.length === 0 && (
        <EstadoVacio
          titulo={hayFiltrosActivos ? "No hay equipos que coincidan con el filtro" : "No hay equipos registrados todavía"}
          descripcion={hayFiltrosActivos ? "Prueba ajustando los filtros." : undefined}
          accionLabel={hayFiltrosActivos ? undefined : "Nuevo equipo"}
          onAccion={onNuevo}
        />
      )}
      {equiposPorCategoria.map(({ categoria, items }) => (
        <section className="categoria-seccion" key={categoria}>
          <div className="categoria-seccion-header">
            <h3 className="font-display">{categoria}</h3>
            <span className="categoria-seccion-count">{items.length}</span>
          </div>

          {/* Las tarjetas de una misma fila se igualan en alto solas (align-items: stretch) */}
          <div className="equipos-grid">
            {items.map((eq) => {
              const tipo = tipos.find((t) => t.nombre === eq.categoria);
              const campos = camposDeLaTarjeta(eq, tipo);
              const conReglas = tipo && !tipo.antigua;
              return (
                <div key={eq.id} className="equipo-card">
                  <div className="equipo-card-header">
                    <div>
                      <div className="equipo-card-code">
                        {!eq.codigo && eq.serial && <span className="equipo-card-id-tipo">Serial </span>}
                        {eq.identificador}
                      </div>
                      <div className="equipo-card-cat">{eq.categoria}</div>
                    </div>
                    <span className={`estado ${eq.estado}`}><i />{ESTADOS[eq.estado]}</span>
                  </div>

                  <div className="equipo-card-body">
                    <div className="equipo-card-fotos-wrap">
                      <div className="equipo-card-fotos">
                        {(eq.fotos && eq.fotos.length > 0 ? eq.fotos : [null, null]).map((foto, i) =>
                          foto ? (
                            <button
                              key={i}
                              type="button"
                              className="equipo-card-foto-btn"
                              title="Ver foto en grande"
                              onClick={() => setFotoMaximizada(foto)}
                            >
                              <img src={foto} alt={`${eq.identificador} — foto ${i + 1}`} loading="lazy" decoding="async" />
                            </button>
                          ) : (
                            <div key={i} className="equipo-card-foto-vacia" />
                          )
                        )}
                      </div>
                      <button
                        className="equipo-card-fotos-editar"
                        type="button"
                        title="Editar fotos"
                        onClick={() => onEditarFotos(eq)}
                      >
                        <IconCamera width={13} height={13} />
                      </button>
                    </div>

                    {eq.responsable && (
                      <div className="equipo-card-asignado">
                        <span className="equipo-card-label">Asignado a</span>
                        <span className="equipo-card-asignado-valor con-icono">
                          {eq.asignadoA?.tipo === "persona" ? (
                            <IconUser width={15} height={15} aria-label="Persona" aria-hidden="false" role="img" />
                          ) : (
                            <IconTruck width={15} height={15} aria-label="Camión" aria-hidden="false" role="img" />
                          )}
                          {eq.responsable}
                        </span>
                      </div>
                    )}

                    {eq.estado === "mantenimiento" && eq.comentarioMantenimiento && (
                      <div className="equipo-card-asignado advertencia">
                        <span className="equipo-card-label">Qué tiene</span>
                        <span className="equipo-card-asignado-valor">
                          {eq.comentarioMantenimiento}
                        </span>
                      </div>
                    )}

                    {campos.length > 0 && (
                      <div className="equipo-card-campos">
                        {campos.map(([campo, valor]) => (
                          <div className="equipo-card-campo" key={campo}>
                            <span className="equipo-card-label">{campo}</span>
                            <span className="equipo-card-campo-valor">{valor}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(conReglas || eq.ultInspeccion || eq.proxInspeccion) && (
                      <div className="equipo-card-inspecciones">
                        <div><span className="equipo-card-label">Inspección</span><span>{eq.ultInspeccion || "—"}</span></div>
                        <div><span className="equipo-card-label">Vencimiento</span><span>{eq.proxInspeccion || "—"}</span></div>
                      </div>
                    )}

                    {eq.faltantes?.length > 0 && (
                      <div className="equipo-faltantes">
                        <span>Faltan datos: {eq.faltantes.join(", ")}.</span>
                        <button className="link-button" type="button" onClick={() => onEditar(eq)}>
                          Completar datos
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="equipo-card-footer">
                    {equipoOcupado?.(eq.id) && (
                      <span className="equipo-card-actualizando" role="status">
                        <Spinner tamano={13} />
                        Actualizando…
                      </span>
                    )}
                    {/* display: contents — deshabilita todo el pie mientras se
                        actualiza el equipo (evita un segundo cambio a la vez). */}
                    <fieldset className="bloque-deshabilitable" disabled={equipoOcupado?.(eq.id)}>
                    <div className="equipo-card-actions">
                      <button className="btn-outline-sm" type="button" onClick={() => onInspeccionar(eq)}>
                        Checklist pre-uso
                      </button>
                      {eq.estado === "asignado" && (
                        <>
                          <button className="btn-outline-sm" type="button" onClick={() => onDevolver(eq)}>
                            Devolver
                          </button>
                          <button className="btn-outline-sm" type="button" onClick={() => onReasignar(eq)}>
                            Reasignar
                          </button>
                        </>
                      )}
                      <button className="icon-btn" type="button" title="Ver hoja de vida" onClick={() => onVerHistorial(eq)}>
                        <IconEye />
                      </button>
                      <button className="btn-outline-sm" type="button" onClick={() => onEditar(eq)}>
                        Editar
                      </button>
                      <button className="icon-btn" type="button" title="Dar de baja" onClick={() => onDarBaja(eq)}>
                        <IconTrash />
                      </button>
                      <button className="btn-outline-sm btn-outline-sm--peligro" type="button" onClick={() => onEliminar(eq)}>
                        Eliminar
                      </button>
                    </div>

                    <label className="equipo-card-select">
                      <span>Cambiar estado</span>
                      <select value={eq.estado} onChange={(e) => onCambiarEstado(eq, e.target.value)}>
                        {Object.entries(ESTADOS).map(([valor, label]) => (
                          <option
                            key={valor}
                            value={valor}
                            disabled={valor === "asignado" && (eq.estado === "vencido" || eq.estado === "debaja")}
                          >
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    </fieldset>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <Lightbox src={fotoMaximizada} alt="Foto del equipo" onClose={() => setFotoMaximizada(null)} />
    </div>
  );
}
