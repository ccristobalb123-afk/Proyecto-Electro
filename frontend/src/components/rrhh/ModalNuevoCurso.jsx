import { Modal, ModalActions, CompanyChoice, AvisoVencimiento } from "../shared/Modal";
import { NOMBRE_EMPRESA } from "../../utils/empresas";
import { IconUpload } from "../icons/Icons";
import { BotonCarga } from "../shared/Carga";
import { AYUDA_ARCHIVO } from "../../services/uploadsService";
import { useEffect, useRef } from "react";
import SelectorPersonal from "./SelectorPersonal";
import { AYUDA, BOTON_SECUNDARIO, CAMPO, DERIVADO, DROPZONE, DROPZONE_CON_ARCHIVO, DROPZONE_SIN_ARCHIVO, ERROR_CAMPO, FILA, NOTA_OBLIGATORIOS, OBLIGATORIO, TITULO_CAMPO } from "../shared/clasesModal";
import { AVISO_FALTAN, AVISO_GUARDADO } from "./clasesRrhh";

const Obligatorio = () => (
  <span className={OBLIGATORIO} aria-hidden="true">
    {" "}*
  </span>
);

// Curso: código + nombre + fechas (varios por persona, sin repetir el
// mismo código). EMO: solo las fechas. El documento es opcional en ambos.
// Dos formas de abrirlo:
//   - Desde la ficha de una persona (`persona`): su nombre queda fijo
//     arriba, sin selector ni tipo (lo decide el botón: "Agregar curso" o
//     "Registrar EMO"). Al crear un curso, "Guardar y agregar otro".
//   - "Nuevo registro" general: selector de personal con buscador y tipo.
export default function ModalNuevoCurso({ open, onClose, fCurso, setFCurso, error, aviso, onArchivoChange, onSubmit, trabajadoresRegistrados, persona, editando, faltantes = [], guardando, textoGuardando }) {
  const codigoRef = useRef(null);
  // Tras "Guardar y agregar otro", el cursor vuelve al código del curso.
  useEffect(() => {
    if (aviso) codigoRef.current?.focus();
  }, [aviso]);
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

  const que = esCurso ? "curso" : "EMO";
  const titulo = persona
    ? editando
      ? `Editar ${que} de ${persona.nombre}`
      : esCurso
        ? `Agregar curso a ${persona.nombre}`
        : `Registrar EMO a ${persona.nombre}`
    : editando
      ? "Editar registro"
      : "Nuevo registro";

  return (
    <Modal
      open={open}
      ocupado={guardando}
      title={titulo}
      subtitle={persona ? `DNI ${persona.dni}` : "Completa los datos del curso o EMO."}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        {aviso && (
          <p className={AVISO_GUARDADO} role="status">
            {aviso}
          </p>
        )}
        {editando && faltantes.length > 0 && esCurso && (
          <p className={AVISO_FALTAN} role="status">
            Completa los datos que faltan: {faltantes.join(", ")}.
          </p>
        )}
        <p className={NOTA_OBLIGATORIOS}>
          Los campos con <span className={OBLIGATORIO}>*</span> son obligatorios.
        </p>

        {!persona && (
          <div className={CAMPO} role="group" aria-labelledby="curso-personal-titulo">
            <span id="curso-personal-titulo" className={TITULO_CAMPO}>
              Personal
              <Obligatorio />
            </span>
            {/* Solo personal ya registrado (con al menos un contrato) —
                desde acá no se puede dar de alta a alguien nuevo, eso
                se hace únicamente desde Contratos. */}
            <SelectorPersonal trabajadores={trabajadoresRegistrados} value={fCurso.dni} onChange={elegirTrabajador} />
            {trabajadoresRegistrados.length === 0 && (
              <p className={ERROR_CAMPO} role="alert">
                Primero registra el contrato de este trabajador en la pestaña Contratos: solo aparece aquí el personal con contrato.
              </p>
            )}
          </div>
        )}

        {empresas.length === 1 && (
          <div className={CAMPO}>
            <span className={TITULO_CAMPO}>Empresa</span>
            <p className={DERIVADO}>
              <span className={`co-badge ${empresas[0]}`}>{NOMBRE_EMPRESA[empresas[0]]}</span>
              según su contrato
            </p>
          </div>
        )}
        {empresas.length > 1 && (
          <fieldset className={CAMPO}>
            <legend>Empresa</legend>
            <p className={AYUDA}>Tiene contrato en más de una empresa: elige a cuál corresponde.</p>
            <CompanyChoice name="empresaCurso" value={fCurso.empresa} opciones={empresas} onChange={(v) => setFCurso({ ...fCurso, empresa: v })} />
          </fieldset>
        )}

        {!persona && (
          <div className={CAMPO}>
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
        )}

        {esCurso && (
          <div className={FILA}>
            <div className={CAMPO}>
              <label>
                <span>
                  Código del curso
                  <Obligatorio />
                </span>
                <input
                  ref={codigoRef}
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
            <div className={CAMPO}>
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

        <div className={FILA}>
          <div className={CAMPO}>
            <label>
              <span>
                Fecha de inicio
                <Obligatorio />
              </span>
              <input required type="date" value={fCurso.fechaInicio} onChange={(e) => setFCurso({ ...fCurso, fechaInicio: e.target.value })} />
            </label>
          </div>
          <div className={CAMPO}>
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

        <div className={CAMPO}>
          <span className={TITULO_CAMPO}>Foto o PDF {esCurso ? "del certificado" : "del EMO"} (opcional)</span>
          <label className={`${DROPZONE} ${fCurso.archivoNombre ? DROPZONE_CON_ARCHIVO : DROPZONE_SIN_ARCHIVO}`}>
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

        {error && <p className={ERROR_CAMPO} role="alert">{error}</p>}

        <ModalActions onCancel={onClose}>
          {persona && esCurso && !editando && (
            <button type="submit" name="accion" value="otro" className={BOTON_SECUNDARIO} disabled={guardando}>
              Guardar y agregar otro
            </button>
          )}
          <BotonCarga type="submit" cargando={guardando} textoCargando={textoGuardando}>
            {editando ? "Guardar cambios" : persona ? (esCurso ? "Guardar curso" : "Guardar EMO") : "Guardar registro"}
          </BotonCarga>
        </ModalActions>
      </form>
    </Modal>
  );
}
