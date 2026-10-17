import { BotonCarga } from "../shared/Carga";
import { Modal, ModalActions } from "../shared/Modal";
import { IconAlertCircle } from "../icons/Icons";
import { hoyEnPeru } from "./camposEquipo";

/**
 * Un equipo vencido solo vuelve a Disponible con fechas nuevas: se abre
 * al elegir "Disponible", al devolver un equipo vencido y desde el aviso
 * de la tarjeta. Cerrar o cancelar lo deja Vencido.
 */
export default function ModalRenovarFechas({ open, equipo, devuelto, fechas, setFechas, onClose, onSubmit, guardando, error }) {
  const hoy = hoyEnPeru();
  return (
    <Modal open={open} ocupado={guardando} title="Renovar fechas" subtitle={equipo ? `${equipo.identificador} — ${equipo.categoria}` : ""} onClose={onClose}>
      {/* noValidate: los mensajes claros salen de errorFechasRenovacion (mismas reglas que el backend). */}
      <form onSubmit={onSubmit} noValidate>
        <div className="consecuencia rechazado">
          <div className="consecuencia-title">
            <IconAlertCircle width={14} height={14} />
            {devuelto ? "Devuelto, pero sigue Vencido" : "Este equipo está vencido"}
          </div>
          <p className="consecuencia-hint">
            {equipo?.proxInspeccion ? `Venció el ${equipo.proxInspeccion}. ` : ""}
            Para volver a usarlo ingresa sus nuevas fechas: queda Disponible al guardar. Si cancelas, se mantiene Vencido.
          </p>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>
              Fecha de inspección
              <input required type="date" value={fechas.fechaInspeccion} onChange={(e) => setFechas({ ...fechas, fechaInspeccion: e.target.value })} />
            </label>
          </div>
          <div className="form-field">
            <label>
              Fecha de vencimiento
              <input
                required
                type="date"
                min={fechas.fechaInspeccion && fechas.fechaInspeccion > hoy ? fechas.fechaInspeccion : hoy}
                value={fechas.fechaVencimiento}
                onChange={(e) => setFechas({ ...fechas, fechaVencimiento: e.target.value })}
              />
            </label>
          </div>
        </div>

        {error && <p className="field-error" role="alert">{error}</p>}
        <ModalActions onCancel={onClose} cancelLabel="Cancelar (sigue Vencido)">
          <BotonCarga type="submit" cargando={guardando} textoCargando="Guardando…">
            Guardar y dejar Disponible
          </BotonCarga>
        </ModalActions>
      </form>
    </Modal>
  );
}

