import { useState } from "react";
import { Modal, ModalActions } from "../shared/Modal";
import { IconTrash } from "../icons/Icons";
import { useConfirm } from "../../context/ConfirmContext";

export default function ModalCategoriasGasto({ open, onClose, categorias, onRenombrar, onEliminar }) {
  const { confirmar, alertar } = useConfirm();
  const [editando, setEditando] = useState(null); // nombre de la categoría que se está editando
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [error, setError] = useState("");

  function abrirEdicion(nombre) {
    setEditando(nombre);
    setNombreNuevo(nombre);
    setError("");
  }

  async function guardarRenombre(nombreActual) {
    if (!nombreNuevo.trim()) return;
    try {
      await onRenombrar(nombreActual, nombreNuevo);
      setEditando(null);
    } catch (err) {
      setError(err.message || "No se pudo renombrar la categoría.");
    }
  }

  async function eliminar(nombre) {
    const seguro = await confirmar(`¿Eliminar la categoría "${nombre}"?`, { tipo: "peligro" });
    if (!seguro) return;
    try {
      await onEliminar(nombre);
    } catch (err) {
      alertar(err.message || "No se pudo eliminar la categoría.");
    }
  }

  return (
    <Modal open={open} title="Gestionar categorías de gasto" onClose={onClose}>
      <div className="categorias-gasto-lista">
        {categorias.map((nombre) => (
          <div className="categorias-gasto-item" key={nombre}>
            {editando === nombre ? (
              <>
                <input
                  autoFocus
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && guardarRenombre(nombre)}
                />
                <button className="btn-outline-sm" type="button" onClick={() => guardarRenombre(nombre)}>Guardar</button>
                <button className="btn-outline-sm" type="button" onClick={() => setEditando(null)}>Cancelar</button>
              </>
            ) : (
              <>
                <span>{nombre}</span>
                <button className="btn-outline-sm" type="button" onClick={() => abrirEdicion(nombre)}>Renombrar</button>
                <button className="icon-btn" type="button" title="Eliminar categoría" onClick={() => eliminar(nombre)}>
                  <IconTrash width={15} height={15} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      {error && <p className="field-error">{error}</p>}
      <ModalActions onCancel={onClose} cancelLabel="Cerrar" />
    </Modal>
  );
}
