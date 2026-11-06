import { Modal, ModalActions, CompanyChoice, AvisoVencimiento } from "../shared/Modal";
import { IconUpload } from "../icons/Icons";
import { BotonCarga } from "../shared/Carga";
import { AYUDA_ARCHIVO } from "../../services/uploadsService";
import { CAMPO, DROPZONE, DROPZONE_CON_ARCHIVO, DROPZONE_SIN_ARCHIVO, ERROR_CAMPO, FILA, TITULO_CAMPO } from "../shared/clasesModal";

export default function ModalNuevoContrato({ open, onClose, fContrato, setFContrato, error, onArchivoChange, onSubmit, editando, guardando, textoGuardando }) {
  return (
    <Modal open={open} ocupado={guardando} title={editando ? "Editar contrato" : "Nuevo contrato"} subtitle="Completa los datos del contrato." onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className={FILA}>
          <div className={CAMPO}>
            <label>
              DNI
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={fContrato.dni}
                onChange={(e) => setFContrato({ ...fContrato, dni: e.target.value.replace(/\D/g, "") })}
                placeholder="Ej. 45678912"
              />
            </label>
          </div>
          <div className={CAMPO}>
            <label>
              Trabajador
              {/* Contratos es el único lugar del sistema donde se registra
                  personal nuevo — por eso acá es texto libre. Cursos y
                  EMO solo pueden elegir entre quienes ya
                  tienen un contrato (ver ModalNuevoCurso). El DNI es la
                  identidad real — si ya existe alguien con ese DNI, este
                  nombre solo lo actualiza (ej. una corrección de
                  ortografía), no crea una persona nueva. */}
              <input
                type="text"
                value={fContrato.trabajador}
                onChange={(e) => setFContrato({ ...fContrato, trabajador: e.target.value })}
                placeholder="Nombre completo del trabajador"
              />
            </label>
          </div>
        </div>

        <fieldset className={CAMPO}>
          <legend>Empresa</legend>
          <CompanyChoice name="empresaContrato" value={fContrato.empresa} onChange={(v) => setFContrato({ ...fContrato, empresa: v })} />
        </fieldset>

        <div className={FILA}>
          <div className={CAMPO}>
            <label>
              Tipo de contrato
              <select value={fContrato.tipo} onChange={(e) => setFContrato({ ...fContrato, tipo: e.target.value })}>
                <option>Plazo fijo</option>
                <option>Indefinido</option>
              </select>
            </label>
          </div>
          <div className={CAMPO}>
            <label>
              Fecha de inicio
              <input type="date" value={fContrato.fechaInicio} onChange={(e) => setFContrato({ ...fContrato, fechaInicio: e.target.value })} />
            </label>
          </div>
        </div>

        <div className={CAMPO}>
          <label>
            Fecha de fin
            <input type="date" value={fContrato.fechaFin} onChange={(e) => setFContrato({ ...fContrato, fechaFin: e.target.value })} />
          </label>
        </div>

        <AvisoVencimiento
          value={fContrato.diasAnticipacion}
          onChange={(v) => setFContrato({ ...fContrato, diasAnticipacion: v })}
          hint="días antes de la fecha de fin"
        />

        <div className={CAMPO}>
          <span className={TITULO_CAMPO}>Documento del contrato</span>
          <label className={`${DROPZONE} ${fContrato.archivoNombre ? DROPZONE_CON_ARCHIVO : DROPZONE_SIN_ARCHIVO}`}>
            <IconUpload width={22} height={22} />
            <p>
              {fContrato.archivoNombre ? (
                <b>{fContrato.archivoNombre}</b>
              ) : (
                <>
                  <b>Haz clic para subir</b> el documento — {AYUDA_ARCHIVO}
                </>
              )}
            </p>
            <input type="file" accept=".pdf,image/*" onChange={onArchivoChange} hidden />
          </label>
        </div>

        {error && <p className={ERROR_CAMPO}>{error}</p>}

        <ModalActions onCancel={onClose}>
          <BotonCarga type="submit" cargando={guardando} textoCargando={textoGuardando}>
            {editando ? "Guardar cambios" : "Guardar contrato"}
          </BotonCarga>
        </ModalActions>
      </form>
    </Modal>
  );
}
