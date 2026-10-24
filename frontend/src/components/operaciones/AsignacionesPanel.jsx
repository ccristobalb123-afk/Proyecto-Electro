import { useState } from "react";
import { IconChevronLeft, IconTruck, IconUser } from "../icons/Icons";
import Loading from "../shared/Loading";
import Lightbox from "../shared/Lightbox";
import { MiniaturasFotos } from "../shared/Modal";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";
import { ESTADOS_EQUIPO } from "../../services/equiposService";

function Resumen({ grupo }) {
  const n = grupo.equipos.length;
  return (
    <span className="persona-cursos__resumen">
      <span>{grupo.detalle}</span>
      <span>
        {n} {n === 1 ? "equipo" : "equipos"}
      </span>
      {grupo.vencidos > 0 && (
        <span className="resumen-chip resumen-chip--vencido">
          {grupo.vencidos} {grupo.vencidos === 1 ? "vencido" : "vencidos"}
        </span>
      )}
    </span>
  );
}

function EquipoAsignado({ equipo, onVerFoto }) {
  return (
    <li className={`registro-ficha ${equipo.vencido ? "registro-ficha--vencido" : ""}`}>
      <div className="registro-ficha__cabecera">
        <span className="asignacion-equipo">
          <span className="asignacion-equipo__tipo">{equipo.categoria}</span>
          <span className="asignacion-equipo__id">
            {equipo.campoIdentificador} <b>{equipo.identificador}</b>
          </span>
        </span>
        <span className={`estado ${equipo.estado}`}>
          <i />
          {ESTADOS_EQUIPO[equipo.estado]}
        </span>
      </div>
      <p className="registro-ficha__fechas">
        <span className={equipo.vencido ? "asignacion-equipo__vencio" : undefined}>
          {equipo.vencimiento ? `${equipo.vencido ? "Venció" : "Vence"} ${equipo.vencimiento}` : "Sin fecha de vencimiento"}
        </span>
        {/* Solo los tipos que piden lote lo traen (los demás, nada). */}
        {"lote" in equipo && (
          <span>
            Lote <b className="asignacion-equipo__lote">{equipo.lote || "—"}</b>
          </span>
        )}
      </p>
      {/* Se monta al desplegar la fila: recién ahí se piden las fotos, y
          el navegador las guarda (su URL cambia solo si cambia la foto). */}
      {equipo.fotos?.length > 0 && <MiniaturasFotos titulo="Fotos" fotos={equipo.fotos} onVerFoto={onVerFoto} />}
    </li>
  );
}

/**
 * Pestaña Asignaciones: cada persona y camión con equipos asignados es
 * una fila desplegable (mismo patrón que Cursos / EMO) con sus equipos:
 * tipo, código o serial, estado, vencimiento, lote (si su tipo lo pide)
 * y sus 2 fotos en miniatura. Los vencidos se marcan en rojo, con texto
 * (no solo color).
 */
export default function AsignacionesPanel({ cargando, error, onReintentar, grupos, hayFiltrosActivos }) {
  const [abiertas, setAbiertas] = useState(() => new Set());
  const [foto, setFoto] = useState(null); // foto ampliada
  const alternar = (clave) =>
    setAbiertas((prev) => {
      const sig = new Set(prev);
      if (sig.has(clave)) sig.delete(clave);
      else sig.add(clave);
      return sig;
    });

  if (cargando) return <Loading texto="Cargando asignaciones…" />;
  if (error) return <EstadoError error={error} onReintentar={onReintentar} />;
  if (grupos.length === 0) {
    return (
      <EstadoVacio
        titulo={hayFiltrosActivos ? "No hay resultados con estos filtros" : "Nadie tiene equipos asignados"}
        descripcion={hayFiltrosActivos ? "Prueba con otro nombre o placa, o con Todos." : "Los equipos se asignan desde la pestaña Equipos."}
      />
    );
  }

  return (
    <>
      <ul className="personas-cursos">
        {grupos.map((g) => {
          const abierta = abiertas.has(g.clave);
          const fichaId = `ficha-asignacion-${g.clave}`;
          const Icono = g.tipo === "camion" ? IconTruck : IconUser;
          return (
            <li key={g.clave} className={`persona-cursos ${abierta ? "persona-cursos--abierta" : ""}`}>
              <button type="button" className="persona-cursos__cabecera" aria-expanded={abierta} aria-controls={fichaId} onClick={() => alternar(g.clave)}>
                <span className="mini-avatar" aria-hidden="true">
                  <Icono width={15} height={15} />
                </span>
                <span className="persona-cursos__info">
                  <span className="persona-cursos__nombre">
                    <span className="sr-only">{g.tipo === "camion" ? "Camión " : "Persona: "}</span>
                    {g.nombre}
                  </span>
                  <Resumen grupo={g} />
                </span>
                <span className="persona-cursos__flecha" aria-hidden="true">
                  <IconChevronLeft width={18} height={18} />
                </span>
              </button>

              {abierta && (
                <div className="persona-cursos__ficha" id={fichaId}>
                  <ul className="registros-ficha">
                    {g.equipos.map((e) => (
                      <EquipoAsignado key={e.id} equipo={e} onVerFoto={setFoto} />
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Lightbox src={foto} alt="Foto del equipo" onClose={() => setFoto(null)} />
    </>
  );
}
