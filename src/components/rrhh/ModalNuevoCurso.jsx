import { Modal, ModalActions, CompanyChoice, AvisoVencimiento } from "../shared/Modal";
import { TRABAJADORES } from "../../services/rrhhService";

export default function ModalNuevoCurso({ open, onClose, fCurso, setFCurso, error, onSubmit }) {
  return (
    <Modal open={open} title="Nuevo registro" subtitle="Completa los datos del curso, fotocheck o EMO." onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label>Trabajador</label>
          <select value={fCurso.trabajador} onChange={(e) => setFCurso({ ...fCurso, trabajador: e.target.value })}>
            <option value="">Selecciona un trabajador...</option>
            {TRABAJADORES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Empresa</label>
            <CompanyChoice name="empresaCurso" value={fCurso.empresa} onChange={(v) => setFCurso({ ...fCurso, empresa: v })} />
          </div>
          <div className="form-field">
            <label>Tipo</label>
            <select value={fCurso.tipo} onChange={(e) => setFCurso({ ...fCurso, tipo: e.target.value })}>
              <option>Curso</option>
              <option>Fotocheck</option>
              <option>EMO</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Fecha de inicio</label>
            <input type="date" value={fCurso.fechaInicio} onChange={(e) => setFCurso({ ...fCurso, fechaInicio: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Fecha de vencimiento</label>
            <input type="date" value={fCurso.fechaVencimiento} onChange={(e) => setFCurso({ ...fCurso, fechaVencimiento: e.target.value })} />
          </div>
        </div>

        <AvisoVencimiento value={fCurso.diasAnticipacion} onChange={(v) => setFCurso({ ...fCurso, diasAnticipacion: v })} />

        {error && <p className="field-error">{error}</p>}

        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">Guardar registro</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
