import { BotonCarga } from "../shared/Carga";
import { Modal, ModalActions } from "../shared/Modal";
import Loading from "../shared/Loading";
import EstadoError from "../shared/EstadoError";
import { IconAlertCircle, IconTruck, IconUser } from "../icons/Icons";
import SelectorDestinatario from "./SelectorDestinatario";
import "./Asignacion.css";
import { CAMPO, ERROR_CAMPO } from "../shared/clasesModal";

// Opciones del selector: camiones por placa y personas por nombre o DNI,
// con la empresa como dato (no limita nada). Las que ya tienen un equipo
// de este tipo llegan con `bloqueo` (el motivo) y no se pueden elegir.
function opcionesCamion(camiones) {
  return camiones.map((c) => ({
    id: c.id,
    titulo: c.placa,
    detalle: [c.tipoUnidad, c.empresaUso ? `${c.empresa} (en uso por ${c.empresaUso})` : c.empresa, c.cuadrilla].filter(Boolean).join(" · "),
    busqueda: `${c.empresa} ${c.cuadrilla || ""}`,
    bloqueo: c.bloqueo,
  }));
}

function opcionesPersona(personas) {
  return personas.map((p) => ({
    id: p.id,
    titulo: p.nombre,
    detalle: `DNI ${p.dni} · ${p.empresas.length ? p.empresas.join(", ") : "Sin contrato"}`,
    busqueda: p.dni,
    bloqueo: p.bloqueo,
  }));
}

/**
 * Asignar (o reasignar) un equipo. A quién se asigna lo decide su tipo
 * (solo camiones o solo personas, de cualquier empresa): el modal solo
 * ofrece destinatarios de ese tipo. Si el equipo ya está asignado, no se
 * ofrece a quien ya lo tiene. El backend vuelve a validar todo.
 */
export default function ModalAsignarEquipo({
  open, equipo, destinatarios, cargando, errorCarga, onReintentar,
  destinoId, setDestinoId, error, onClose, onConfirmar, guardando, errorServidor,
}) {
  const reasignar = !!equipo?.asignadoA;
  const aCamion = destinatarios?.destino === "camion";
  const lista = (aCamion ? destinatarios?.camiones : destinatarios?.personas)?.filter((d) => !d.actual) || [];
  const elegibles = lista.filter((d) => !d.bloqueo);
  const listo = !cargando && !errorCarga && destinatarios;
  const Icono = aCamion ? IconTruck : IconUser;

  return (
    <Modal
      open={open}
      ocupado={guardando}
      title={reasignar ? "Reasignar equipo" : "Asignar equipo"}
      subtitle={equipo ? `${equipo.identificador} — ${equipo.categoria}` : ""}
      onClose={onClose}
    >
      {reasignar && (
        <p className="asignar-actual">
          Ahora lo tiene <b>{equipo.responsable}</b>. Al reasignarlo, esa asignación se cierra en el historial.
        </p>
      )}

      {cargando && <Loading texto="Cargando destinatarios…" />}
      {errorCarga && <EstadoError error={errorCarga} onReintentar={onReintentar} />}

      {listo && (
        <>
          <p className="destino-fijo">
            <Icono width={18} height={18} />
            <span>
              Los equipos de tipo <b>{destinatarios.tipoEquipo}</b> se asignan solo a {aCamion ? "camiones" : "personas"}
              {destinatarios.variasPorDestinatario ? " (puede tener varios)" : ", uno por " + (aCamion ? "camión" : "persona")}.
            </span>
          </p>

          {elegibles.length === 0 && (
            <div className="danger-box advertencia" role="status">
              <div className="danger-title">
                <IconAlertCircle width={14} height={14} />
                {lista.length > 0
                  ? `${aCamion ? "Todos los camiones ya tienen" : "Todas las personas ya tienen"} un equipo de este tipo`
                  : aCamion
                    ? reasignar ? "No hay otro camión registrado" : "No hay camiones registrados"
                    : reasignar ? "No hay otra persona registrada" : "No hay personal registrado"}
              </div>
              <p className="danger-hint">
                {lista.length > 0
                  ? "Devuelve o reasigna uno de esos equipos para liberar a alguien."
                  : aCamion
                    ? "Los camiones se registran en la pestaña Vehículos."
                    : "El personal se registra con su contrato en RR. HH."}
              </p>
            </div>
          )}

          {/* También cuando todos están ocupados: se ve quién tiene qué. */}
          {lista.length > 0 && (
            <div className={CAMPO}>
              <SelectorDestinatario
                opciones={aCamion ? opcionesCamion(lista) : opcionesPersona(lista)}
                value={destinoId}
                onChange={setDestinoId}
                etiqueta={aCamion ? "Buscar camión por placa" : "Buscar persona por nombre o DNI"}
                placeholder={aCamion ? "Escribe la placa…" : "Escribe el nombre o DNI…"}
                sinCoincidencias={aCamion ? "No hay camiones que coincidan con" : "No hay personas que coincidan con"}
              />
              {error && <p className={ERROR_CAMPO}>Elige {aCamion ? "un camión" : "una persona"} antes de continuar.</p>}
            </div>
          )}
        </>
      )}

      {errorServidor && <p className={ERROR_CAMPO} role="alert">{errorServidor}</p>}
      <ModalActions onCancel={onClose}>
        {listo && elegibles.length > 0 && (
          <BotonCarga cargando={guardando} textoCargando={reasignar ? "Reasignando…" : "Asignando…"} onClick={onConfirmar}>
            {reasignar ? "Reasignar" : "Asignar"}
          </BotonCarga>
        )}
      </ModalActions>
    </Modal>
  );
}
