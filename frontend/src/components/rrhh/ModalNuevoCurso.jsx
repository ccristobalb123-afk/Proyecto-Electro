import { Modal, ModalActions, CompanyChoice, AvisoVencimiento } from "../shared/Modal";
import { IconUpload } from "../icons/Icons";

export default function ModalNuevoCurso({ open, onClose, fCurso, setFCurso, error, onArchivoChange, onSubmit, trabajadoresRegistrados, editando }) {
  return (
    <Modal open={open} title={editando ? "Editar registro" : "Nuevo registro"} subtitle="Completa los datos del curso, fotocheck o EMO." onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label>
            Trabajador
            {/* Solo personal ya registrado (con al menos un contrato) —
                desde acá no se puede dar de alta a alguien nuevo, eso
                se hace únicamente desde Contratos. */}
            <select value={fCurso.dni} onChange={(e) => setFCurso({ ...fCurso, dni: e.target.value })}>
              <option value="">Selecciona un trabajador registrado...</option>
              {trabajadoresRegistrados.map((t) => (
                <option key={t.dni} value={t.dni}>{t.nombre} — {t.dni}</option>
              ))}
            </select>
          </label>
          {trabajadoresRegistrados.length === 0 && (
            <p className="field-error">
              Todavía no hay personal registrado. Registra primero un contrato en la pestaña Contratos.
            </p>
          )}
        </div>

        <fieldset className="form-field">
          <legend>Empresa</legend>
          <CompanyChoice name="empresaCurso" value={fCurso.empresa} onChange={(v) => setFCurso({ ...fCurso, empresa: v })} />
        </fieldset>

        <div className="form-row">
          <div className="form-field">
            <label>
              Tipo
              <select value={fCurso.tipo} onChange={(e) => setFCurso({ ...fCurso, tipo: e.target.value })}>
                <option>Curso</option>
                <option>Fotocheck</option>
                <option>EMO</option>
              </select>
            </label>
          </div>
          <div className="form-field">
            <label>
              Fecha de inicio
              <input type="date" value={fCurso.fechaInicio} onChange={(e) => setFCurso({ ...fCurso, fechaInicio: e.target.value })} />
            </label>
          </div>
        </div>

        <div className="form-field">
          <label>
            Fecha de vencimiento
            <input type="date" value={fCurso.fechaVencimiento} onChange={(e) => setFCurso({ ...fCurso, fechaVencimiento: e.target.value })} />
          </label>
        </div>

        <AvisoVencimiento value={fCurso.diasAnticipacion} onChange={(v) => setFCurso({ ...fCurso, diasAnticipacion: v })} />

        <div className="form-field">
          <span className="form-field-heading">Foto o PDF {fCurso.tipo === "Curso" ? "del certificado" : `del ${fCurso.tipo}`} (opcional)</span>
          <label className={`dropzone ${fCurso.archivoNombre ? "has-file" : ""}`}>
            <IconUpload width={22} height={22} />
            <p>
              {fCurso.archivoNombre ? (
                <b>{fCurso.archivoNombre}</b>
              ) : (
                <>
                  <b>Haz clic para subir</b> una foto o PDF — JPG, PNG, WEBP o PDF, hasta 10 MB
                </>
              )}
            </p>
            <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={onArchivoChange} hidden />
          </label>
        </div>

        {error && <p className="field-error">{error}</p>}

        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">{editando ? "Guardar cambios" : "Guardar registro"}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
