import { useState } from "react";
import { IconEye, IconTrash, IconCamera } from "../icons/Icons";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";
import Lightbox from "../shared/Lightbox";

import { ESTADOS_EQUIPO as ESTADOS } from "../../services/equiposService";

export default function EquiposGrid({
  cargando,
  error,
  onReintentar,
  equiposPorCategoria,
  hayFiltrosActivos,
  onNuevo,
  onInspeccionar,
  onDevolver,
  onVerHistorial,
  onDarBaja,
  onCambiarEstado,
  onEditarFotos,
  onEditar,
  onEliminar,
}) {
  const [fotoMaximizada, setFotoMaximizada] = useState(null);

  if (cargando) return <Loading texto="Cargando equipos..." />;
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
              const campos = Object.entries(eq.camposValores || {});
              return (
                <div key={eq.id} className="equipo-card">
                  <div className="equipo-card-header">
                    <div>
                      <div className="equipo-card-code">{eq.codigo}</div>
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
                              <img src={foto} alt={`${eq.codigo} — foto ${i + 1}`} loading="lazy" decoding="async" />
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
                        <span className="equipo-card-asignado-valor">👤 {eq.responsable}</span>
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

                    {(eq.ultInspeccion || eq.proxInspeccion) && (
                      <div className="equipo-card-inspecciones">
                        {eq.ultInspeccion && (
                          <div><span className="equipo-card-label">Últ. inspección</span><span>{eq.ultInspeccion}</span></div>
                        )}
                        {eq.proxInspeccion && (
                          <div><span className="equipo-card-label">Próx. inspección</span><span>{eq.proxInspeccion}</span></div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="equipo-card-footer">
                    <div className="equipo-card-actions">
                      <button className="btn-outline-sm" type="button" onClick={() => onInspeccionar(eq)}>
                        Checklist pre-uso
                      </button>
                      {eq.estado === "asignado" && (
                        <button className="btn-outline-sm" type="button" onClick={() => onDevolver(eq)}>
                          Devolver
                        </button>
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
