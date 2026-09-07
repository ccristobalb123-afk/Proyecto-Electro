import { Modal, ModalActions } from "../shared/Modal";
import { IconCamera, IconTrash } from "../icons/Icons";
import { comprimirImagen } from "../../utils/imageUtils";

export default function ModalEditarFotosEquipo({ open, equipo, fotos, setFotos, onClose, onGuardar }) {
  async function handleFotoChange(indice, archivo) {
    if (!archivo) return;
    const dataUrl = await comprimirImagen(archivo);
    const nuevas = [...fotos];
    nuevas[indice] = dataUrl;
    setFotos(nuevas);
  }

  function quitarFoto(indice) {
    const nuevas = [...fotos];
    nuevas[indice] = null;
    setFotos(nuevas);
  }

  return (
    <Modal
      open={open}
      title="Editar fotos del equipo"
      subtitle={equipo ? `${equipo.codigo} — ${equipo.categoria}` : ""}
      onClose={onClose}
    >
      <div className="fotos-equipo-row">
        {[0, 1].map((indice) => {
          const foto = fotos[indice];
          return (
            <div className="foto-equipo-slot" key={indice}>
              {foto ? (
                <>
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

      <ModalActions onCancel={onClose}>
        <button className="btn-primary" type="button" onClick={onGuardar}>Guardar fotos</button>
      </ModalActions>
    </Modal>
  );
}
