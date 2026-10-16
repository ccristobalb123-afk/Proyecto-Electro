import { Modal, ModalActions, CompanyChoice, AvisoVencimiento } from "../shared/Modal";
import { NOMBRE_EMPRESA } from "../../utils/empresas";
import { IconUpload } from "../icons/Icons";
import { BotonCarga } from "../shared/Carga";
import { AYUDA_ARCHIVO } from "../../services/uploadsService";

const Obligatorio = () => (
  <span className="campo-obligatorio" aria-hidden="true">
    {" "}*
  </span>
);

// Curso: código + nombre + fechas (varios por persona, sin repetir el
// mismo código). EMO: solo las fechas. El documento es opcional en ambos.
export default function ModalNuevoCurso({ open, onClose, fCurso, setFCurso, error, onArchivoChange, onSubmit, trabajadoresRegistrados, editando, faltantes = [], guardando, textoGuardando }) {
  // La empresa sale del contrato del trabajador: con contrato en una
  // sola empresa no se pregunta; en varias, se elige solo entre esas.
  const empresasDe = (dni) => trabajadoresRegistrados.find((t) => t.dni === dni)?.empresas || [];
  const empresas = empresasDe(fCurso.dni);
  const esCurso = fCurso.tipo === "Curso";

  function elegirTrabajador(dni) {
    const disponibles = empresasDe(dni);
    const empresa = disponibles.length === 1 ? disponibles[0] : disponibles.includes(fCurso.empresa) ? fCurso.empresa : "";
    setFCurso({ ...fCurso, dni, empresa });
  }

  return (
    <Modal open={open} ocupado={guardando} title={editando ? "Editar registro" : "Nuevo registro"} subtitle="Completa los datos del curso o EMO." onClose={onClose}>
      <form onSubmit={onSubmit}>
        {editando && faltantes.length > 0 && esCurso && (
          <p className="rrhh-faltantes" role="status">
            Completa los datos que faltan: {faltantes.join(", ")}.
          </p>
        )}
        <p className="campos-obligatorios-nota">
          Los campos con <span className="campo-obligatorio">*</span> son obligatorios.
        </p>

        <div className="form-field">
          <label>
            <span>
              Trabajador
              <Obligatorio />
            </span>
            {/* Solo personal ya registrado (con al menos un contrato) —
                desde acá no se puede dar de alta a alguien nuevo, eso
                se hace únicamente desde Contratos. */}
            <select required value={fCurso.dni} onChange={(e) => elegirTrabajador(e.target.value)}>
              <option value="">Selecciona un trabajador registrado...</option>
              {trabajadoresRegistrados.map((t) => (
                <option key={t.dni} value={t.dni}>{t.nombre} — {t.dni}</option>
              ))}
            </select>
          </label>
          {trabajadoresRegistrados.length === 0 && (
            <p className="field-error" role="alert">
              Primero registra el contrato de este trabajador en la pestaña Contratos: solo aparece aquí el personal con contrato.
            </p>
          )}
        </div>

        {empresas.length === 1 && (
          <div className="form-field">
            <span className="form-field-heading">Empresa</span>
            <p className="campo-derivado">
              <span className={`co-badge ${empresas[0]}`}>{NOMBRE_EMPRESA[empresas[0]]}</span>
              según su contrato
            </p>
          </div>
        )}
        {empresas.length > 1 && (
          <fieldset className="form-field">
            <legend>Empresa</legend>
            <p className="campo-ayuda">Tiene contrato en más de una empresa: elige a cuál corresponde.</p>
            <CompanyChoice name="empresaCurso" value={fCurso.empresa} opciones={empresas} onChange={(v) => setFCurso({ ...fCurso, empresa: v })} />
          </fieldset>
        )}

        <div className="form-field">
          <label>
            <span>
              Tipo
              <Obligatorio />
            </span>
            <select value={fCurso.tipo} onChange={(e) => setFCurso({ ...fCurso, tipo: e.target.value })}>
              <option>Curso</option>
              <option>EMO</option>
            </select>
          </label>
        </div>

        {esCurso && (
          <div className="form-row">
            <div className="form-field">
              <label>
                <span>
                  Código del curso
                  <Obligatorio />
                </span>
                <input
                  required
                  maxLength={30}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Ej. TA-01"
                  value={fCurso.codigoCurso}
                  onChange={(e) => setFCurso({ ...fCurso, codigoCurso: e.target.value.toUpperCase() })}
                />
              </label>
            </div>
            <div className="form-field">
              <label>
                <span>
                  Curso
                  <Obligatorio />
                </span>
                <input
                  required
                  maxLength={120}
                  autoCapitalize="sentences"
                  placeholder="Ej. Trabajo en altura"
                  value={fCurso.nombreCurso}
                  onChange={(e) => setFCurso({ ...fCurso, nombreCurso: e.target.value })}
                />
              </label>
            </div>
          </div>
        )}

        <div className="form-row">
          <div className="form-field">
            <label>
              <span>
                Fecha de inicio
                <Obligatorio />
              </span>
              <input required type="date" value={fCurso.fechaInicio} onChange={(e) => setFCurso({ ...fCurso, fechaInicio: e.target.value })} />
            </label>
          </div>
          <div className="form-field">
            <label>
              <span>
                Fecha de vencimiento
                <Obligatorio />
              </span>
              <input
                required
                type="date"
                min={fCurso.fechaInicio || undefined}
                value={fCurso.fechaVencimiento}
                onChange={(e) => setFCurso({ ...fCurso, fechaVencimiento: e.target.value })}
              />
            </label>
          </div>
        </div>

        <AvisoVencimiento value={fCurso.diasAnticipacion} onChange={(v) => setFCurso({ ...fCurso, diasAnticipacion: v })} />

        <div className="form-field">
          <span className="form-field-heading">Foto o PDF {esCurso ? "del certificado" : "del EMO"} (opcional)</span>
          <label className={`dropzone ${fCurso.archivoNombre ? "has-file" : ""}`}>
            <IconUpload width={22} height={22} />
            <p>
              {fCurso.archivoNombre ? (
                <b>{fCurso.archivoNombre}</b>
              ) : (
                <>
                  <b>Haz clic para subir</b> una foto o PDF — {AYUDA_ARCHIVO}
                </>
              )}
            </p>
            <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={onArchivoChange} hidden />
          </label>
        </div>

        {error && <p className="field-error" role="alert">{error}</p>}

        <ModalActions onCancel={onClose}>
          <BotonCarga type="submit" cargando={guardando} textoCargando={textoGuardando}>
            {editando ? "Guardar cambios" : "Guardar registro"}
          </BotonCarga>
        </ModalActions>
      </form>
    </Modal>
  );
}
