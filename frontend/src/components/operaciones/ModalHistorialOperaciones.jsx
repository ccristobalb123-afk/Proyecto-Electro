import { useState } from "react";
import { Modal, Timeline } from "../shared/Modal";
import Lightbox from "../shared/Lightbox";
import Loading from "../shared/Loading";
import { IconTruck, IconUser } from "../icons/Icons";
import { MENSAJE_VACIO } from "../shared/clasesModal";

// Hoja de vida: títulos de sección y lista de asignaciones.
const SECCION = "mx-0 mt-0 mb-2 text-[14px] font-semibold";
const ASIGNACIONES = "mx-0 mt-0 mb-4 flex list-none flex-col gap-2 p-0";
const ASIGNACION = "flex gap-2.5 rounded border border-border [background:var(--card)] px-3 py-2.5";
const ASIGNACION_ICONO = "mt-0.5 flex-none text-electro-dark";
const ASIGNACION_CUERPO = "flex min-w-0 flex-col gap-0.5 text-[14px]";
const ASIGNACION_NOMBRE = "font-semibold wrap-anywhere";
const ASIGNACION_FECHAS = "text-sm text-muted";
const VIGENTE = "self-start rounded-[999px] bg-success-tint px-2 py-px text-xs font-semibold text-success-dark";

// Quién tuvo el equipo, desde y hasta cuándo (solo equipos).
function HistorialAsignaciones({ asignaciones }) {
  return (
    <section aria-labelledby="hv-asignaciones">
      <h3 className={SECCION} id="hv-asignaciones">Asignaciones</h3>
      {asignaciones.length === 0 ? (
        <p className={MENSAJE_VACIO}>Todavía no se ha asignado.</p>
      ) : (
        <ul className={ASIGNACIONES}>
          {asignaciones.map((a) => (
            <li key={a.id} className={ASIGNACION}>
              {a.tipo === "camion" ? <IconTruck className={ASIGNACION_ICONO} width={18} height={18} /> : <IconUser className={ASIGNACION_ICONO} width={18} height={18} />}
              <div className={ASIGNACION_CUERPO}>
                <span className={ASIGNACION_NOMBRE}>
                  {a.tipo === "camion" ? `Camión ${a.destinatario}` : a.destinatario}
                  {a.dni && <span className={ASIGNACION_FECHAS}> · DNI {a.dni}</span>}
                </span>
                <span className={ASIGNACION_FECHAS}>Desde {a.desde}</span>
                {a.hasta ? (
                  <span className={ASIGNACION_FECHAS}>
                    Hasta {a.hasta}
                    {a.motivoFin ? ` · ${a.motivoFin}` : ""}
                  </span>
                ) : (
                  <span className={VIGENTE}>Vigente</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ModalHistorialOperaciones({ open, seleccionado, cargando, items, asignaciones, onClose }) {
  // Foto ampliada (inspecciones y cambios de fotos de un equipo).
  const [foto, setFoto] = useState(null);
  return (
    <Modal
      open={open}
      title={seleccionado ? `Hoja de vida — ${seleccionado.identificador || seleccionado.placa}` : ""}
      subtitle={seleccionado ? seleccionado.categoria || seleccionado.tipoUnidad : ""}
      onClose={onClose}
    >
      {cargando ? (
        <Loading texto="Cargando historial…" />
      ) : (
        <>
          {asignaciones && (
            <>
              <HistorialAsignaciones asignaciones={asignaciones} />
              <h3 className={SECCION}>Hoja de vida</h3>
            </>
          )}
          <Timeline items={items} onVerFoto={setFoto} />
        </>
      )}
      <Lightbox src={foto} alt="Foto del historial del equipo" onClose={() => setFoto(null)} />
    </Modal>
  );
}
