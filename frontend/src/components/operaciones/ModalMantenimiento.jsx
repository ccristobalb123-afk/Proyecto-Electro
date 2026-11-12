import { BotonCarga } from "../shared/Carga";
import { Modal, ModalActions } from "../shared/Modal";
import { IconAlertCircle } from "../icons/Icons";
import { CAMPO, ERROR_CAMPO, RECUADRO, RECUADRO_TEXTO, RECUADRO_TITULO } from "../shared/clasesModal";

// Si el equipo ya está en Mantenimiento, actualiza el comentario: el
// nuevo reemplaza al de la tarjeta y el anterior queda en la hoja de vida.
export default function ModalMantenimiento({ open, equipo, comentario, setComentario, error, onClose, onConfirmar, guardando, errorServidor }) {
  const actualizando = equipo?.estado === "mantenimiento";
  return (
    <Modal
      open={open}
      ocupado={guardando}
      title={actualizando ? "Actualizar comentario de mantenimiento" : "Enviar a mantenimiento"}
      subtitle={equipo ? `${equipo.identificador} — ${equipo.categoria}` : ""}
      onClose={onClose}
    >
      <div className={RECUADRO.advertencia}>
        <div className={RECUADRO_TITULO.advertencia}>
          <IconAlertCircle width={14} height={14} />
          {actualizando ? "Cuenta cómo sigue el equipo" : "Cuenta qué le pasa al equipo"}
        </div>
        <p className={RECUADRO_TEXTO.advertencia}>
          {actualizando
            ? "El comentario nuevo reemplaza al de la tarjeta; el anterior queda guardado en la hoja de vida."
            : "Este comentario queda guardado en la hoja de vida del equipo, para que quien lo reciba en mantenimiento sepa exactamente qué revisar."}
          {!actualizando && equipo?.responsable && ` El equipo deja de estar asignado a ${equipo.responsable}.`}
          {equipo?.vencidoPorFecha && " Su fecha de vencimiento ya pasó: seguirá sin poder usarse hasta registrar la inspección aprobada."}
        </p>
      </div>

      <div className={CAMPO}>
        <label htmlFor="mantenimiento-comentario">¿Qué tiene el equipo?</label>
        <textarea
          id="mantenimiento-comentario"
          rows={4}
          placeholder="Ej. Cable deshilachado en el mosquetón, falla en el cierre automático..."
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
        {error && <p className={ERROR_CAMPO} role="alert">Cuenta qué tiene el equipo antes de continuar.</p>}
      </div>

      {errorServidor && <p className={ERROR_CAMPO} role="alert">{errorServidor}</p>}
      <ModalActions onCancel={onClose}>
        <BotonCarga cargando={guardando} textoCargando={actualizando ? "Guardando…" : "Enviando…"} onClick={onConfirmar}>
          {actualizando ? "Guardar comentario" : "Enviar a mantenimiento"}
        </BotonCarga>
      </ModalActions>
    </Modal>
  );
}
