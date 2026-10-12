import { useState } from "react";
import { Modal, ModalActions } from "../shared/Modal";
import { IconTrash } from "../icons/Icons";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import { useAccion } from "../../hooks/useAccion";
import { BotonCarga } from "../shared/Carga";

export default function ModalCategoriasEquipo({ open, onClose, categorias, onRenombrar, onEliminar }) {
  const { confirmar } = useConfirm();
  const { mostrarToast } = useToast();
  const acciones = useAccion();
  const renombrando = acciones.ocupado("renombrar");
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
    setError("");
    await acciones.ejecutar("renombrar", async () => {
      try {
        await onRenombrar(nombreActual, nombreNuevo);
        setEditando(null);
        mostrarToast("Categoría renombrada", { tipo: "success" });
      } catch (err) {
        setError(err.message || "No se pudo renombrar la categoría.");
      }
    });
  }

  // Si la categoría está en uso, el backend responde 409 y el mensaje
  // se muestra dentro del mismo diálogo (sugiere renombrarla).
  async function eliminar(nombre) {
    const ok = await confirmar({
      titulo: `¿Eliminar la categoría "${nombre}"?`,
      mensaje: `Dejará de aparecer al registrar equipos. Solo se puede eliminar si ningún registro la usa. Esta acción no se puede deshacer.`,
      tipo: "peligro",
      textoConfirmar: "Eliminar categoría",
      textoCargando: "Eliminando…",
      accion: () => onEliminar(nombre),
    });
    if (ok) mostrarToast("Categoría eliminada", { tipo: "success" });
  }

  const nombres = Object.keys(categorias);

  return (
    <Modal ocupado={renombrando} open={open} title="Gestionar categorías de equipo" subtitle="Los campos personalizados de cada categoría se editan al crear un equipo nuevo." onClose={onClose}>
      <div className="categorias-lista">
        {nombres.map((nombre) => (
          <div className="categorias-lista-item" key={nombre}>
            {editando === nombre ? (
              <>
                <input
                  autoFocus
                  aria-label={`Nuevo nombre para la categoría ${nombre}`}
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && guardarRenombre(nombre)}
                />
                <BotonCarga className="btn-outline-sm" cargando={renombrando} textoCargando="Guardando…" onClick={() => guardarRenombre(nombre)}>
                  Guardar
                </BotonCarga>
                <button className="btn-outline-sm" type="button" disabled={renombrando} onClick={() => setEditando(null)}>Cancelar</button>
              </>
            ) : (
              <>
                <span>
                  {nombre} <small>({categorias[nombre].length} campo{categorias[nombre].length !== 1 ? "s" : ""})</small>
                </span>
                <button className="btn-outline-sm" type="button" onClick={() => abrirEdicion(nombre)}>Renombrar</button>
                <button className="icon-btn icon-btn--peligro" type="button" title="Eliminar categoría" aria-label={`Eliminar la categoría ${nombre}`} onClick={() => eliminar(nombre)}>
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
