import { Modal, ModalActions, CompanyChoice } from "../shared/Modal";
import { IconClipboardCheck, IconPlus, IconTrash, IconCamera } from "../icons/Icons";
import { CATEGORIAS } from "../../services/equiposService";
import { comprimirImagen } from "../../utils/imageUtils";

const OPCION_NUEVA = "__nueva__";

export default function ModalNuevoEquipo({
  open,
  onClose,
  fEquipo,
  setFEquipo,
  errorCodigo,
  checkCodigo,
  onSubmit,
  nuevaCategoria,
  setNuevaCategoria,
  nombreNuevaCategoria,
  setNombreNuevaCategoria,
  camposNuevaCategoria,
  setCamposNuevaCategoria,
  errorCategoria,
}) {
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
    setCamposNuevaCategoria([...camposNuevaCategoria, { nombre: "", placeholder: "" }]);
  }

  function quitarCampoNuevo(i) {
    setCamposNuevaCategoria(camposNuevaCategoria.filter((_, idx) => idx !== i));
  }

  async function handleFotoChange(indice, archivo) {
    if (!archivo) return;
    const dataUrl = await comprimirImagen(archivo);
    const fotos = [...(fEquipo.fotos || [null, null])];
    fotos[indice] = dataUrl;
    setFEquipo({ ...fEquipo, fotos });
  }

  function quitarFoto(indice) {
    const fotos = [...(fEquipo.fotos || [null, null])];
    fotos[indice] = null;
    setFEquipo({ ...fEquipo, fotos });
  }

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
            <select
              value={nuevaCategoria ? OPCION_NUEVA : fEquipo.categoria}
              onChange={(e) => handleCategoriaChange(e.target.value)}
            >
              {Object.keys(CATEGORIAS).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value={OPCION_NUEVA}>+ Nueva categoría...</option>
            </select>
          </div>
        </div>

        {nuevaCategoria ? (
          <div className="categoria-nueva-box">
            <div className="form-field">
              <label>Nombre de la categoría</label>
              <input
                value={nombreNuevaCategoria}
                onChange={(e) => setNombreNuevaCategoria(e.target.value)}
                placeholder="Ej. Cascos de Seguridad"
              />
            </div>

            <label className="categoria-nueva-campos-label">
              Campos que debe tener esta categoría
            </label>
            <p className="categoria-nueva-hint">
              No todos los equipos tienen las mismas características — define aquí qué datos
              vas a pedir para este tipo (ej. Serie, Talla, Marca...).
            </p>

            {camposNuevaCategoria.map((campo, i) => (
              <div className="campo-nuevo-row" key={i}>
                <input
                  value={campo.nombre}
                  onChange={(e) => actualizarCampoNuevo(i, "nombre", e.target.value)}
                  placeholder="Nombre del campo (ej. Serie)"
                />
                <input
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
          )
        )}

        <div className="form-field">
          <label>Empresa dueña</label>
          <CompanyChoice name="empresaEquipo" value={fEquipo.empresa} onChange={(v) => setFEquipo({ ...fEquipo, empresa: v })} />
        </div>

        <div className="form-field">
          <label>Fotos del equipo (hasta 2)</label>
          <div className="fotos-equipo-row">
            {[0, 1].map((indice) => {
              const foto = (fEquipo.fotos || [null, null])[indice];
              return (
                <div className="foto-equipo-slot" key={indice}>
                  {foto ? (
                    <>
                      {/* Tocar la foto reemplaza directo — subir una nueva
                          descarta automáticamente la anterior, sin tener
                          que borrarla primero. */}
                      <label className="foto-equipo-reemplazar" title="Tocar para reemplazar">
                        <img src={foto} alt={`Foto ${indice + 1}`} />
                        <div className="foto-equipo-reemplazar-hint">
                          <IconCamera width={16} height={16} />
                          <span>Cambiar</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          style={{ display: "none" }}
                          onChange={(e) => handleFotoChange(indice, e.target.files?.[0])}
                        />
                      </label>
                      <button
                        className="foto-equipo-quitar"
                        type="button"
                        title="Quitar foto"
                        onClick={() => quitarFoto(indice)}
                      >
                        <IconTrash width={13} height={13} />
                      </button>
                    </>
                  ) : (
                    <label className="foto-equipo-vacio">
                      <IconCamera width={20} height={20} />
                      <span>Agregar foto</span>
                      {/* accept+capture: en celular abre la cámara directo; en
                          computadora abre el explorador de archivos normal. */}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: "none" }}
                        onChange={(e) => handleFotoChange(indice, e.target.files?.[0])}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
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
