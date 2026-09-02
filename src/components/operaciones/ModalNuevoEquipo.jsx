import { Modal, ModalActions, CompanyChoice } from "../shared/Modal";
import { IconClipboardCheck } from "../icons/Icons";
import { CATEGORIAS } from "../../services/equiposService";

export default function ModalNuevoEquipo({ open, onClose, fEquipo, setFEquipo, errorCodigo, checkCodigo, onSubmit }) {
  return (
    <Modal open={open} title="Nuevo equipo" subtitle="Completa los datos del equipo o EPP." onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <div className="form-field">
            <label>Código</label>
            <input value={fEquipo.codigo} onChange={(e) => checkCodigo(e.target.value)} placeholder="EQ-081" />
            {errorCodigo && <p className="field-error">Ese código ya existe. Usa otro.</p>}
          </div>
          <div className="form-field">
            <label>Categoría</label>
            <select value={fEquipo.categoria} onChange={(e) => setFEquipo({ ...fEquipo, categoria: e.target.value, camposValores: {} })}>
              {Object.keys(CATEGORIAS).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          {CATEGORIAS[fEquipo.categoria].map((campo) => (
            <div className="form-field" key={campo.nombre}>
              <label>{campo.nombre}</label>
              <input
                placeholder={campo.placeholder}
                value={fEquipo.camposValores[campo.nombre] || ""}
                onChange={(e) =>
                  setFEquipo({
                    ...fEquipo,
                    camposValores: { ...fEquipo.camposValores, [campo.nombre]: e.target.value },
                  })
                }
              />
            </div>
          ))}
        </div>

        <div className="form-field">
          <label>Empresa dueña</label>
          <CompanyChoice name="empresaEquipo" value={fEquipo.empresa} onChange={(v) => setFEquipo({ ...fEquipo, empresa: v })} />
        </div>

        <div className="checklist-note">
          <IconClipboardCheck width={15} height={15} />
          El checklist pre-uso se toma automáticamente de la plantilla de la categoría elegida.
        </div>

        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">Guardar equipo — queda Disponible</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
