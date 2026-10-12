import { Modal, ModalActions, CompanyChoice } from "../shared/Modal";
import { useState } from "react";
import { IconClipboardCheck, IconPlus, IconTrash } from "../icons/Icons";
import { BotonCarga } from "../shared/Carga";
import FotosEquipo from "./FotosEquipo";

const OPCION_NUEVA = "__nueva__";

export default function ModalNuevoEquipo({
  open,
  onClose,
  fEquipo,
  setFEquipo,
  errorCodigo,
  checkCodigo,
  onSubmit,
  categorias,
  nuevaCategoria,
  setNuevaCategoria,
  nombreNuevaCategoria,
  setNombreNuevaCategoria,
  camposNuevaCategoria,
  setCamposNuevaCategoria,
  errorCategoria,
  onAbrirGestionCategorias,
  error,
  guardando,
  textoGuardando,
}) {
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  function handleCategoriaChange(valor) {
    if (valor === OPCION_NUEVA) {
      setNuevaCategoria(true);
      setFEquipo({ ...fEquipo, categoria: "", camposValores: {} });
    } else {
      setNuevaCategoria(false);
      setFEquipo({ ...fEquipo, categoria: valor, camposValores: {} });
    }
  }

  function actualizarCampoNuevo(i, key, valor) {
    setCamposNuevaCategoria(
      camposNuevaCategoria.map((c, idx) => (idx === i ? { ...c, [key]: valor } : c))
    );
  }

  function agregarCampoNuevo() {
    setCamposNuevaCategoria([...camposNuevaCategoria, { id: crypto.randomUUID(), nombre: "", placeholder: "" }]);
  }

  function quitarCampoNuevo(i) {
    setCamposNuevaCategoria(camposNuevaCategoria.filter((_, idx) => idx !== i));
  }

  return (
    <Modal open={open} ocupado={guardando} title="Nuevo equipo" subtitle="Completa los datos del equipo o EPP." onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <div className="form-field">
            <label>
              Código
              <input value={fEquipo.codigo} onChange={(e) => checkCodigo(e.target.value)} placeholder="EQ-081" />
            </label>
            {errorCodigo && <p className="field-error">Ese código ya existe. Usa otro.</p>}
          </div>
          <div className="form-field">
            <label>
              Categoría
              <select
                value={nuevaCategoria ? OPCION_NUEVA : fEquipo.categoria}
                onChange={(e) => handleCategoriaChange(e.target.value)}
              >
                {Object.keys(categorias).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value={OPCION_NUEVA}>+ Nueva categoría...</option>
              </select>
            </label>
            <button className="link-button" type="button" onClick={onAbrirGestionCategorias}>
              Gestionar categorías
            </button>
          </div>
        </div>

        {nuevaCategoria ? (
          <div className="categoria-nueva-box">
            <div className="form-field">
              <label>
                Nombre de la categoría
                <input
                  value={nombreNuevaCategoria}
                  onChange={(e) => setNombreNuevaCategoria(e.target.value)}
                  placeholder="Ej. Cascos de Seguridad"
                />
              </label>
            </div>

            <label className="categoria-nueva-campos-label">
              Campos que debe tener esta categoría
            </label>
            <p className="categoria-nueva-hint">
              No todos los equipos tienen las mismas características — define aquí qué datos
              vas a pedir para este tipo (ej. Serie, Talla, Marca...).
            </p>

            {camposNuevaCategoria.map((campo, i) => (
              <div className="campo-nuevo-row" key={campo.id}>
                <input
                  aria-label={`Nombre del campo ${i + 1}`}
                  value={campo.nombre}
                  onChange={(e) => actualizarCampoNuevo(i, "nombre", e.target.value)}
                  placeholder="Nombre del campo (ej. Serie)"
                />
                <input
                  aria-label={`Ejemplo a mostrar del campo ${i + 1}`}
                  value={campo.placeholder}
                  onChange={(e) => actualizarCampoNuevo(i, "placeholder", e.target.value)}
                  placeholder="Ejemplo a mostrar (ej. SC-2201)"
                />
                <button
                  className="icon-btn"
                  type="button"
                  title="Quitar campo"
                  onClick={() => quitarCampoNuevo(i)}
                  disabled={camposNuevaCategoria.length === 1}
                >
                  <IconTrash />
                </button>
              </div>
            ))}

            <button className="btn-outline-sm" type="button" onClick={agregarCampoNuevo}>
              <IconPlus width={13} height={13} /> Agregar campo
            </button>

            {errorCategoria && <p className="field-error">{errorCategoria}</p>}
          </div>
        ) : (
          fEquipo.categoria && (
            <div className="form-row">
              {(categorias[fEquipo.categoria] || []).map((campo) => (
                <div className="form-field" key={campo.nombre}>
                  <label>
                    {campo.nombre}
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
                  </label>
                </div>
              ))}
            </div>
          )
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
          El checklist pre-uso se toma automáticamente de la plantilla de la categoría elegida.
        </div>

        {error && <p className="field-error" role="alert">{error}</p>}

        <ModalActions onCancel={onClose}>
          <BotonCarga type="submit" cargando={guardando} textoCargando={textoGuardando} disabled={procesandoFoto}>
            Guardar equipo
          </BotonCarga>
        </ModalActions>
      </form>
    </Modal>
  );
}
