import { useState } from "react";
import { Modal, Timeline } from "../shared/Modal";
import Lightbox from "../shared/Lightbox";
import Loading from "../shared/Loading";
import { IconTruck, IconUser } from "../icons/Icons";
import "./Asignacion.css";
import { MENSAJE_VACIO } from "../shared/clasesModal";

// Quién tuvo el equipo, desde y hasta cuándo (solo equipos).
function HistorialAsignaciones({ asignaciones }) {
  return (
    <section aria-labelledby="hv-asignaciones">
      <h3 className="hv-seccion-titulo" id="hv-asignaciones">Asignaciones</h3>
      {asignaciones.length === 0 ? (
        <p className={MENSAJE_VACIO}>Todavía no se ha asignado.</p>
      ) : (
        <ul className="asignaciones-historial">
          {asignaciones.map((a) => (
            <li key={a.id} className="asignacion-item">
              {a.tipo === "camion" ? <IconTruck width={18} height={18} /> : <IconUser width={18} height={18} />}
              <div className="asignacion-item__cuerpo">
                <span className="asignacion-item__nombre">
                  {a.tipo === "camion" ? `Camión ${a.destinatario}` : a.destinatario}
                  {a.dni && <span className="asignacion-item__fechas"> · DNI {a.dni}</span>}
                </span>
                <span className="asignacion-item__fechas">Desde {a.desde}</span>
                {a.hasta ? (
                  <span className="asignacion-item__fechas">
                    Hasta {a.hasta}
                    {a.motivoFin ? ` · ${a.motivoFin}` : ""}
                  </span>
                ) : (
                  <span className="asignacion-item__vigente">Vigente</span>
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
              <h3 className="hv-seccion-titulo">Hoja de vida</h3>
            </>
          )}
          <Timeline items={items} onVerFoto={setFoto} />
        </>
      )}
      <Lightbox src={foto} alt="Foto del historial del equipo" onClose={() => setFoto(null)} />
    </Modal>
  );
}
