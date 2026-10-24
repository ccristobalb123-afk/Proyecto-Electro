import { useState } from "react";
import { BotonCarga } from "../shared/Carga";
import { Modal, ModalActions, AvisoVencimiento } from "../shared/Modal";
import { IconEye, IconAlertCircle } from "../icons/Icons";
import FotosEquipo from "./FotosEquipo";
import { fotosQueFaltan } from "./camposEquipo";

// Por qué se abrió para renovar fechas (equipo vencido). Sin contexto: una
// inspección normal desde "Actualizar inspección".
const AVISO_VENCIDO = {
  vencido: "Este equipo está vencido",
  devuelto: "Devuelto, pero sigue Vencido",
  disponible: "Para dejarlo Disponible, renueva sus fechas",
};

/**
 * "Actualizar inspección" — también la abre "Renovar fechas" de un equipo
 * vencido (contexto). Siempre interna, con las 2 fotos del equipo: cada
 * una se mantiene o se cambia, y no se guarda con menos de 2.
 */
export default function ModalInspeccion({ open, equipo, contexto, fInspeccion, setFInspeccion, onClose, onSubmit, guardando, errorServidor }) {
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const faltan = fotosQueFaltan(fInspeccion.fotos);
  const liberar = contexto === "disponible" && !!equipo?.responsable;

  return (
    <Modal
      open={open}
      ocupado={guardando}
      title="Actualizar inspección"
      subtitle={equipo ? `${equipo.identificador} — ${equipo.categoria}` : ""}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} noValidate>
        {contexto && (
          <div className="consecuencia rechazado">
            <div className="consecuencia-title">
              <IconAlertCircle width={14} height={14} />
              {AVISO_VENCIDO[contexto]}
            </div>
            <p className="consecuencia-hint">
              {equipo?.proxInspeccion ? `Venció el ${equipo.proxInspeccion}. ` : ""}
              Para volver a usarlo registra la inspección con resultado Aprobado y una fecha de vencimiento de hoy en adelante. Si cancelas, se mantiene Vencido.
            </p>
          </div>
        )}

        <fieldset className="form-field">
          <legend className="form-field-heading">Fotos del equipo</legend>
          <p className="campo-ayuda">
            {faltan > 0
              ? `El equipo debe quedar con 2 fotos: falta${faltan === 1 ? " 1" : "n 2"}.`
              : "Mantén las fotos actuales o cambia la que necesites. La que cambies queda guardada en el historial."}
          </p>
          <FotosEquipo
            actuales={equipo?.fotos || []}
            valor={fInspeccion.fotos}
            onChange={(fotos) => setFInspeccion({ ...fInspeccion, fotos })}
            onProcesando={setProcesandoFoto}
          />
        </fieldset>

        <div className="form-row">
          <div className="form-field">
            <label>
              Fecha de inspección
              <input type="date" value={fInspeccion.fechaInspeccion} onChange={(e) => setFInspeccion({ ...fInspeccion, fechaInspeccion: e.target.value })} />
            </label>
          </div>
          <div className="form-field">
            <label>
              Fecha de vencimiento
              <input type="date" value={fInspeccion.fechaVencimiento} onChange={(e) => setFInspeccion({ ...fInspeccion, fechaVencimiento: e.target.value })} />
            </label>
          </div>
        </div>

        <AvisoVencimiento
          hint="días antes de la próxima inspección (1 a 365)"
          value={fInspeccion.diasAnticipacion}
          onChange={(v) => setFInspeccion({ ...fInspeccion, diasAnticipacion: v })}
        />

        <div className="form-field">
          <label>
            Resultado
            <select value={fInspeccion.resultado} onChange={(e) => setFInspeccion({ ...fInspeccion, resultado: e.target.value })}>
              <option value="aprobado">Aprobado</option>
              <option value="observado">Observado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </label>
        </div>

        {fInspeccion.resultado === "aprobado" ? (
          <div className="consecuencia aprobado">
            <div className="consecuencia-title">
              <IconEye width={14} height={14} />
              {liberar ? `Queda Disponible y deja de estar asignado a ${equipo.responsable}` : equipo?.responsable ? `Sigue asignado a ${equipo.responsable}` : "El equipo queda Disponible"}
            </div>
            <p className="consecuencia-hint">
              {equipo?.estado === "vencido"
                ? "El equipo está vencido: se renuevan sus fechas, y la de vencimiento tiene que ser de hoy en adelante."
                : "Se actualiza la próxima inspección con esta fecha de vencimiento."}
            </p>
          </div>
        ) : (
          <div className="consecuencia rechazado">
            <div className="consecuencia-title"><IconAlertCircle width={14} height={14} />El equipo pasa a Mantenimiento</div>
            <p className="consecuencia-hint">
              {equipo?.responsable ? `Deja de estar asignado a ${equipo.responsable}. ` : ""}
              No podrá asignarse hasta una nueva inspección con resultado Aprobado.
            </p>
          </div>
        )}

        {errorServidor && <p className="field-error" role="alert">{errorServidor}</p>}
        <ModalActions onCancel={onClose} cancelLabel={contexto ? "Cancelar (sigue Vencido)" : "Cancelar"}>
          <BotonCarga type="submit" cargando={guardando} textoCargando="Guardando inspección…" disabled={procesandoFoto}>
            Guardar inspección
          </BotonCarga>
        </ModalActions>
      </form>
    </Modal>
  );
}
