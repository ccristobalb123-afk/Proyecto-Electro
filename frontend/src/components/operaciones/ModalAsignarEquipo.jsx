import { BotonCarga } from "../shared/Carga";
import { Modal, ModalActions } from "../shared/Modal";
import Loading from "../shared/Loading";
import EstadoError from "../shared/EstadoError";
import { IconAlertCircle, IconTruck, IconUser } from "../icons/Icons";
import SelectorDestinatario from "./SelectorDestinatario";
import "./Asignacion.css";

// Opciones del selector: camiones por placa y personas por nombre o DNI,
// con la empresa como dato (no limita nada).
function opcionesCamion(camiones) {
  return camiones.map((c) => ({
    id: c.id,
    titulo: c.placa,
    detalle: [c.tipoUnidad, c.empresaUso ? `${c.empresa} (en uso por ${c.empresaUso})` : c.empresa, c.cuadrilla].filter(Boolean).join(" · "),
    busqueda: `${c.empresa} ${c.cuadrilla || ""}`,
  }));
}

function opcionesPersona(personas) {
  return personas.map((p) => ({
    id: p.id,
    titulo: p.nombre,
    detalle: `DNI ${p.dni} · ${p.empresas.length ? p.empresas.join(", ") : "Sin contrato"}`,
    busqueda: p.dni,
  }));
}

/**
 * Asignar (o reasignar) un equipo a un camión O a una persona, de
 * cualquier empresa. Primero se elige el tipo de destinatario y luego se
 * busca. Si el equipo ya está asignado, no se ofrece a quien ya lo tiene.
 */
export default function ModalAsignarEquipo({
  open, equipo, destinatarios, cargando, errorCarga, onReintentar,
  tipo, setTipo, destinoId, setDestinoId, error, onClose, onConfirmar, guardando, errorServidor,
}) {
  const actual = equipo?.asignadoA;
  const reasignar = !!actual;
  const camiones = (destinatarios?.camiones || []).filter((c) => !(actual?.tipo === "camion" && actual.id === c.id));
  const personas = (destinatarios?.personas || []).filter((p) => !(actual?.tipo === "persona" && actual.id === p.id));
  const lista = tipo === "camion" ? camiones : personas;
  const otroTipo = tipo === "camion" ? "persona" : "camion";
  const hayOtro = (otroTipo === "camion" ? camiones : personas).length > 0;
  const listo = !cargando && !errorCarga && destinatarios;

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

      {cargando && <Loading texto="Cargando camiones y personal…" />}
      {errorCarga && <EstadoError error={errorCarga} onReintentar={onReintentar} />}

      {listo && (
        <>
          <fieldset className="form-field destino-tipo">
            <legend className="form-field-heading">¿A quién se asigna?</legend>
            <div className="destino-choice">
              <label className={tipo === "camion" ? "seleccionado" : ""}>
                <input type="radio" name="destino-tipo" checked={tipo === "camion"} onChange={() => setTipo("camion")} />
                <IconTruck width={18} height={18} />
                Camión
              </label>
              <label className={tipo === "persona" ? "seleccionado" : ""}>
                <input type="radio" name="destino-tipo" checked={tipo === "persona"} onChange={() => setTipo("persona")} />
                <IconUser width={18} height={18} />
                Persona
              </label>
            </div>
          </fieldset>

          {lista.length === 0 ? (
            <div className="danger-box advertencia" role="status">
              <div className="danger-title">
                <IconAlertCircle width={14} height={14} />
                {tipo === "camion"
                  ? reasignar && actual.tipo === "camion" ? "No hay otro camión registrado" : "No hay camiones registrados"
                  : reasignar && actual.tipo === "persona" ? "No hay otra persona registrada" : "No hay personal registrado"}
              </div>
              <p className="danger-hint">
                {tipo === "camion"
                  ? "Los camiones se registran en la pestaña Vehículos."
                  : "El personal se registra con su contrato en RR. HH."}
              </p>
              {hayOtro && (
                <button type="button" className="btn-outline-sm destino-otro" onClick={() => setTipo(otroTipo)}>
                  {otroTipo === "camion" ? <IconTruck width={16} height={16} /> : <IconUser width={16} height={16} />}
                  Asignar a {otroTipo === "camion" ? "un camión" : "una persona"}
                </button>
              )}
            </div>
          ) : (
            <div className="form-field">
              <SelectorDestinatario
                key={tipo}
                opciones={tipo === "camion" ? opcionesCamion(camiones) : opcionesPersona(personas)}
                value={destinoId}
                onChange={setDestinoId}
                etiqueta={tipo === "camion" ? "Buscar camión por placa" : "Buscar persona por nombre o DNI"}
                placeholder={tipo === "camion" ? "Escribe la placa…" : "Escribe el nombre o DNI…"}
                sinCoincidencias={tipo === "camion" ? "No hay camiones que coincidan con" : "No hay personas que coincidan con"}
              />
              {error && <p className="field-error">Elige {tipo === "camion" ? "un camión" : "una persona"} antes de continuar.</p>}
            </div>
          )}
        </>
      )}

      {errorServidor && <p className="field-error" role="alert">{errorServidor}</p>}
      <ModalActions onCancel={onClose}>
        {listo && lista.length > 0 && (
          <BotonCarga cargando={guardando} textoCargando={reasignar ? "Reasignando…" : "Asignando…"} onClick={onConfirmar}>
            {reasignar ? "Reasignar" : "Asignar"}
          </BotonCarga>
        )}
      </ModalActions>
    </Modal>
  );
}
