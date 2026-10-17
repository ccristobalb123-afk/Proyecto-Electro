import { BotonCarga } from "../shared/Carga";
import { Modal, ModalActions, AvisoVencimiento } from "../shared/Modal";
import { IconUpload, IconEye, IconAlertCircle } from "../icons/Icons";

export default function ModalInspeccion({ open, equipo, fInspeccion, setFInspeccion, onClose, onSubmit, guardando, errorServidor }) {
  return (
    <Modal
      open={open}
      ocupado={guardando}
      title="Registrar inspección"
      subtitle={equipo ? `${equipo.identificador} — ${equipo.categoria}` : ""}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label>
            Tipo de inspección
            <select value={fInspeccion.tipo} onChange={(e) => setFInspeccion({ ...fInspeccion, tipo: e.target.value })}>
              <option value="interna">Interna — con foto</option>
              <option value="externa">Externa — con certificado</option>
            </select>
          </label>
        </div>

        <div className="form-field" role="group" aria-labelledby="inspeccion-archivo-titulo">
          <span id="inspeccion-archivo-titulo" className="form-field-heading">
            {fInspeccion.tipo === "interna" ? "Foto de la inspección" : "Certificado (PDF)"}
          </span>
          <label className="dropzone">
            <IconUpload width={22} height={22} />
            <p><b>Haz clic para subir</b> — {fInspeccion.tipo === "interna" ? "foto (JPG/PNG)" : "certificado (PDF)"}</p>
            <input type="file" hidden />
          </label>
        </div>

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
              {equipo?.responsable ? `Sigue asignado a ${equipo.responsable}` : "El equipo queda Disponible"}
            </div>
            <p className="consecuencia-hint">Se actualiza la próxima inspección con esta fecha de vencimiento.</p>
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
        <ModalActions onCancel={onClose}>
          <BotonCarga type="submit" cargando={guardando} textoCargando="Registrando inspección…">
            Guardar inspección
          </BotonCarga>
        </ModalActions>
      </form>
    </Modal>
  );
}
