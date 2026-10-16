import { Modal, ModalActions, CompanyChoice } from "../shared/Modal";
import { useState } from "react";
import { IconClipboardCheck } from "../icons/Icons";
import { BotonCarga } from "../shared/Carga";
import FotosEquipo from "./FotosEquipo";
import CamposEquipo from "./CamposEquipo";

// Tipos fijos (los 9 de la tabla): ya no se crean categorías desde acá.
// Al elegir el tipo aparecen solo sus campos, todos obligatorios.
export default function ModalNuevoEquipo({ open, onClose, fEquipo, setFEquipo, onSubmit, tipos, error, guardando, textoGuardando }) {
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const tipo = tipos.find((t) => t.nombre === fEquipo.categoria);

  return (
    <Modal open={open} ocupado={guardando} title="Nuevo equipo" subtitle="Completa los datos del equipo o EPP." onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label>
            <span>
              Tipo de equipo<span className="campo-obligatorio" aria-hidden="true"> *</span>
            </span>
            <select required value={fEquipo.categoria} onChange={(e) => setFEquipo({ ...fEquipo, categoria: e.target.value })}>
              <option value="" disabled>
                Elige el tipo de equipo…
              </option>
              {tipos.map((t) => (
                <option key={t.nombre} value={t.nombre}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        {tipo && (
          <CamposEquipo
            campos={tipo.campos}
            valores={fEquipo.valores}
            onChange={(valores) => setFEquipo((f) => ({ ...f, valores }))}
          />
        )}

        <fieldset className="form-field">
          <legend>Empresa dueña</legend>
          <CompanyChoice name="empresaEquipo" value={fEquipo.empresa} onChange={(v) => setFEquipo({ ...fEquipo, empresa: v })} />
        </fieldset>

        <fieldset className="form-field">
          <legend>Fotos del equipo</legend>
          <FotosEquipo
            fotos={fEquipo.fotos || [null, null]}
            onChange={(fotos) => setFEquipo((f) => ({ ...f, fotos }))}
            onProcesando={setProcesandoFoto}
          />
        </fieldset>

        <div className="checklist-note">
          <IconClipboardCheck width={15} height={15} />
          Las próximas inspecciones se registran con «Checklist pre-uso» en la tarjeta del equipo.
        </div>

        {error && <p className="field-error" role="alert">{error}</p>}

        <ModalActions onCancel={onClose}>
          <BotonCarga type="submit" cargando={guardando} textoCargando={textoGuardando} disabled={procesandoFoto || !tipo}>
            Guardar equipo
          </BotonCarga>
        </ModalActions>
      </form>
    </Modal>
  );
}
