import { Modal, ModalActions, CompanyChoice, AvisoVencimiento } from "../shared/Modal";
import { IconUpload } from "../icons/Icons";
import { TRABAJADORES } from "../../services/rrhhService";

export default function ModalNuevoContrato({ open, onClose, fContrato, setFContrato, error, onArchivoChange, onSubmit }) {
  return (
    <Modal open={open} title="Nuevo contrato" subtitle="Completa los datos del contrato." onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label>Trabajador</label>
          <select value={fContrato.trabajador} onChange={(e) => setFContrato({ ...fContrato, trabajador: e.target.value })}>
            <option value="">Selecciona un trabajador...</option>
            {TRABAJADORES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Empresa</label>
          <CompanyChoice name="empresaContrato" value={fContrato.empresa} onChange={(v) => setFContrato({ ...fContrato, empresa: v })} />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Tipo de contrato</label>
            <select value={fContrato.tipo} onChange={(e) => setFContrato({ ...fContrato, tipo: e.target.value })}>
              <option>Plazo fijo</option>
              <option>Indefinido</option>
            </select>
          </div>
          <div className="form-field">
            <label>Fecha de inicio</label>
            <input type="date" value={fContrato.fechaInicio} onChange={(e) => setFContrato({ ...fContrato, fechaInicio: e.target.value })} />
          </div>
        </div>

        <div className="form-field">
          <label>Fecha de fin</label>
          <input type="date" value={fContrato.fechaFin} onChange={(e) => setFContrato({ ...fContrato, fechaFin: e.target.value })} />
        </div>

        <AvisoVencimiento
          value={fContrato.diasAnticipacion}
          onChange={(v) => setFContrato({ ...fContrato, diasAnticipacion: v })}
          hint="días antes de la fecha de fin"
        />

        <div className="form-field">
          <label>Documento del contrato</label>
          <label className={`dropzone ${fContrato.archivoNombre ? "has-file" : ""}`}>
            <IconUpload width={22} height={22} />
            <p>
              {fContrato.archivoNombre ? (
                <b>{fContrato.archivoNombre}</b>
              ) : (
                <>
                  <b>Haz clic para subir</b> o arrastra el archivo — PDF o foto
                </>
              )}
            </p>
            <input type="file" accept=".pdf,image/*" onChange={onArchivoChange} hidden />
          </label>
        </div>

        {error && <p className="field-error">{error}</p>}

        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">Guardar contrato</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
