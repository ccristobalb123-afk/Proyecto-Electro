import { useState } from "react";
import { IconChevronLeft, IconTruck, IconUser } from "../icons/Icons";
import Loading from "../shared/Loading";
import Lightbox from "../shared/Lightbox";
import { MiniaturasFotos } from "../shared/Modal";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";
import { ESTADOS_EQUIPO } from "../../services/equiposService";
import { AVATAR_FORMA } from "../shared/clasesTarjeta";
import * as F from "../shared/clasesFicha";
import { ESTADO_EQUIPO, ESTADO_PUNTO } from "./clasesEquipos";

// Avatar de 26px con el ícono de persona o camión (el de RRHH es de 30px).
const AVATAR = `size-[26px] ${AVATAR_FORMA}`;
// Equipo dentro de la ficha: tipo, identificador (código o serial) y lote.
const EQUIPO = "flex min-w-0 flex-col gap-0.5";
const EQUIPO_TIPO = "font-semibold text-text wrap-anywhere";
const EQUIPO_ID = "text-sm text-muted wrap-anywhere";
const EQUIPO_ID_VALOR = "[font-family:var(--font-mono)] font-semibold text-text";
const LOTE = "[font-family:var(--font-mono)] font-semibold wrap-anywhere";
// Vencido: "Venció …" en rojo (el registro lleva además borde y franja roja).
const VENCIO = "font-semibold text-danger-dark";

function Resumen({ grupo }) {
  const n = grupo.equipos.length;
  return (
    <span className={F.RESUMEN}>
      <span>{grupo.detalle}</span>
      <span>
        {n} {n === 1 ? "equipo" : "equipos"}
      </span>
      {grupo.vencidos > 0 && (
        <span className={F.CHIP_VENCIDO}>
          {grupo.vencidos} {grupo.vencidos === 1 ? "vencido" : "vencidos"}
        </span>
      )}
    </span>
  );
}

function EquipoAsignado({ equipo, onVerFoto }) {
  return (
    <li className={equipo.vencido ? F.REGISTRO_VENCIDO : F.REGISTRO_NORMAL}>
      <div className={F.REGISTRO_CABECERA}>
        <span className={EQUIPO}>
          <span className={EQUIPO_TIPO}>{equipo.categoria}</span>
          <span className={EQUIPO_ID}>
            {equipo.campoIdentificador} <b className={EQUIPO_ID_VALOR}>{equipo.identificador}</b>
          </span>
        </span>
        <span className={ESTADO_EQUIPO[equipo.estado]}>
          <i className={ESTADO_PUNTO} />
          {ESTADOS_EQUIPO[equipo.estado]}
        </span>
      </div>
      <p className={F.REGISTRO_FECHAS}>
        <span className={equipo.vencido ? VENCIO : undefined}>
          {equipo.vencimiento ? `${equipo.vencido ? "Venció" : "Vence"} ${equipo.vencimiento}` : "Sin fecha de vencimiento"}
        </span>
        {/* Solo los tipos que piden lote lo traen (los demás, nada). */}
        {"lote" in equipo && (
          <span>
            Lote <b className={LOTE}>{equipo.lote || "—"}</b>
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
      <ul className={F.FICHAS}>
        {grupos.map((g) => {
          const abierta = abiertas.has(g.clave);
          const fichaId = `ficha-asignacion-${g.clave}`;
          const Icono = g.tipo === "camion" ? IconTruck : IconUser;
          return (
            <li key={g.clave} className={abierta ? F.FICHA_ABIERTA : F.FICHA_CERRADA}>
              <button type="button" className={F.CABECERA} aria-expanded={abierta} aria-controls={fichaId} onClick={() => alternar(g.clave)}>
                <span className={AVATAR} aria-hidden="true">
                  <Icono width={15} height={15} />
                </span>
                <span className={F.INFO}>
                  <span className={F.NOMBRE}>
                    <span className="sr-only">{g.tipo === "camion" ? "Camión " : "Persona: "}</span>
                    {g.nombre}
                  </span>
                  <Resumen grupo={g} />
                </span>
                <span className={abierta ? F.FLECHA_ABIERTA : F.FLECHA_CERRADA} aria-hidden="true">
                  <IconChevronLeft className={abierta ? F.FLECHA_ICONO_ABIERTA : F.FLECHA_ICONO_CERRADA} width={18} height={18} />
                </span>
              </button>

              {abierta && (
                <div className={F.DETALLE} id={fichaId}>
                  <ul className={F.REGISTROS}>
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
