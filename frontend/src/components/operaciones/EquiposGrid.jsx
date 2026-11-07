import { useState } from "react";
import { IconEye, IconTrash, IconCamera, IconTruck, IconUser } from "../icons/Icons";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";
import { Spinner } from "../shared/Carga";
import Lightbox from "../shared/Lightbox";

import { ESTADOS_EQUIPO as ESTADOS } from "../../services/equiposService";
import { CAMPOS_EQUIPO } from "./camposEquipo";
import * as C from "./clasesEquipos";

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
  onRenovar,
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
    <div className={C.GRUPOS}>
      {equiposPorCategoria.length === 0 && (
        <EstadoVacio
          titulo={hayFiltrosActivos ? "No hay equipos que coincidan con el filtro" : "No hay equipos registrados todavía"}
          descripcion={hayFiltrosActivos ? "Prueba ajustando los filtros." : undefined}
          accionLabel={hayFiltrosActivos ? undefined : "Nuevo equipo"}
          onAccion={onNuevo}
        />
      )}
      {equiposPorCategoria.map(({ categoria, items }) => (
        <section key={categoria}>
          <div className={C.GRUPO_CABECERA}>
            <h3 className={`font-display ${C.GRUPO_TITULO}`}>{categoria}</h3>
            <span className={C.GRUPO_CONTADOR}>{items.length}</span>
          </div>

          {/* Las tarjetas de una misma fila se igualan en alto solas (align-items: stretch) */}
          <div className={C.GRILLA}>
            {items.map((eq) => {
              const tipo = tipos.find((t) => t.nombre === eq.categoria);
              const campos = camposDeLaTarjeta(eq, tipo);
              const conReglas = tipo && !tipo.antigua;
              return (
                <div key={eq.id} className={C.TARJETA}>
                  <div className={C.CABECERA}>
                    <div>
                      <div className={C.CODIGO}>
                        {!eq.codigo && eq.serial && <span className={C.CODIGO_TIPO}>Serial </span>}
                        {eq.identificador}
                      </div>
                      <div className={C.TIPO}>{eq.categoria}</div>
                    </div>
                    <span className={C.ESTADO_EQUIPO[eq.estado]}><i className={C.ESTADO_PUNTO} />{ESTADOS[eq.estado]}</span>
                  </div>

                  <div className={C.CUERPO}>
                    <div className={C.FOTOS_CAJA}>
                      <div className={C.FOTOS}>
                        {(eq.fotos && eq.fotos.length > 0 ? eq.fotos : [null, null]).map((foto, i) =>
                          foto ? (
                            <button
                              key={i}
                              type="button"
                              className={C.FOTO_BOTON}
                              title="Ver foto en grande"
                              onClick={() => setFotoMaximizada(foto)}
                            >
                              <img className={C.FOTO_IMAGEN} src={foto} alt={`${eq.identificador} — foto ${i + 1}`} loading="lazy" decoding="async" />
                            </button>
                          ) : (
                            <div key={i} className={C.FOTO_VACIA} />
                          )
                        )}
                      </div>
                      <button
                        className={C.FOTOS_EDITAR}
                        type="button"
                        title="Editar fotos"
                        onClick={() => onEditarFotos(eq)}
                      >
                        <IconCamera width={13} height={13} />
                      </button>
                    </div>

                    {eq.responsable && (
                      <div className={C.ASIGNADO}>
                        <span className={C.ETIQUETA_ASIGNADO}>Asignado a</span>
                        <span className={C.ASIGNADO_VALOR}>
                          {eq.asignadoA?.tipo === "persona" ? (
                            <IconUser className="flex-none" width={15} height={15} aria-label="Persona" aria-hidden="false" role="img" />
                          ) : (
                            <IconTruck className="flex-none" width={15} height={15} aria-label="Camión" aria-hidden="false" role="img" />
                          )}
                          {eq.responsable}
                        </span>
                      </div>
                    )}

                    {/* Vencido (pasó su fecha): bloqueado hasta renovar. */}
                    {eq.estado === "vencido" && (
                      <div className={C.AVISO_VENCIDO} role="status">
                        <span>
                          {eq.proxInspeccion ? `Venció el ${eq.proxInspeccion}. ` : ""}
                          {eq.responsable
                            ? `Sigue asignado a ${eq.responsable}, pero no se puede usar: devuélvelo o renueva sus fechas.`
                            : "No se puede asignar ni usar hasta renovar sus fechas."}
                        </span>
                        <button className="link-button" type="button" onClick={() => onRenovar(eq)}>
                          Renovar fechas
                        </button>
                      </div>
                    )}

                    {eq.estado === "mantenimiento" && eq.comentarioMantenimiento && (
                      <div className={C.ADVERTENCIA}>
                        <span className={C.ETIQUETA_ADVERTENCIA}>Qué tiene</span>
                        <span className={C.ADVERTENCIA_VALOR}>
                          {eq.comentarioMantenimiento}
                        </span>
                      </div>
                    )}

                    {campos.length > 0 && (
                      <div className={C.CAMPOS}>
                        {campos.map(([campo, valor]) => (
                          <div className={C.CAMPO} key={campo}>
                            <span className={C.ETIQUETA}>{campo}</span>
                            <span className={C.CAMPO_VALOR}>{valor}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(conReglas || eq.ultInspeccion || eq.proxInspeccion) && (
                      <div className={C.INSPECCIONES}>
                        <div className={C.CAMPO}><span className={C.ETIQUETA}>Inspección</span><span>{eq.ultInspeccion || "—"}</span></div>
                        <div className={C.CAMPO}><span className={C.ETIQUETA}>Vencimiento</span><span>{eq.proxInspeccion || "—"}</span></div>
                      </div>
                    )}

                    {eq.faltantes?.length > 0 && (
                      <div className={C.AVISO_FALTAN}>
                        <span>Faltan datos: {eq.faltantes.join(", ")}.</span>
                        <button className="link-button" type="button" onClick={() => onEditar(eq)}>
                          Completar datos
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={C.PIE}>
                    {equipoOcupado?.(eq.id) && (
                      <span className={C.ACTUALIZANDO} role="status">
                        <Spinner tamano={13} />
                        Actualizando…
                      </span>
                    )}
                    {/* display: contents — deshabilita todo el pie mientras se
                        actualiza el equipo (evita un segundo cambio a la vez). */}
                    <fieldset className="contents" disabled={equipoOcupado?.(eq.id)}>
                    <div className={C.ACCIONES}>
                      <button className="btn-outline-sm" type="button" onClick={() => onInspeccionar(eq)}>
                        Actualizar inspección
                      </button>
                      {/* Devolver también si venció estando asignado; reasignar no. */}
                      {eq.asignadoA && (
                        <button className="btn-outline-sm" type="button" onClick={() => onDevolver(eq)}>
                          Devolver
                        </button>
                      )}
                      {eq.estado === "asignado" && (
                        <button className="btn-outline-sm" type="button" onClick={() => onReasignar(eq)}>
                          Reasignar
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

                    <label className={C.CAMBIAR_ESTADO}>
                      <span>Cambiar estado</span>
                      <select className={C.CAMBIAR_ESTADO_SELECT} value={eq.estado} onChange={(e) => onCambiarEstado(eq, e.target.value)}>
                        {/* Vencido no se elige: depende de la fecha. Solo aparece
                            (sin poder elegirse) para mostrar el estado actual. */}
                        {Object.entries(ESTADOS)
                          .filter(([valor]) => valor !== "vencido" || eq.estado === "vencido")
                          .map(([valor, label]) => (
                            <option
                              key={valor}
                              value={valor}
                              disabled={valor === "vencido" || (valor === "asignado" && (eq.estado === "vencido" || eq.estado === "debaja"))}
                            >
                              {valor === "disponible" && eq.estado === "vencido" ? "Disponible (renovar fechas)" : label}
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
