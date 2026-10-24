import { Modal, ModalActions } from "../shared/Modal";
import { useState } from "react";
import { BotonCarga } from "../shared/Carga";
import FotosEquipo from "./FotosEquipo";
import { fotosQueFaltan } from "./camposEquipo";

/**
 * "Editar fotos": cambiar una o las dos fotos sin registrar una
 * inspección (no cambia fechas, resultado ni estado). El equipo queda
 * siempre con 2 fotos y la que se reemplaza queda en el historial
 * ("Fotos actualizadas").
 */
export default function ModalEditarFotosEquipo({ open, equipo, fotos, setFotos, onClose, onGuardar, guardando, errorServidor }) {
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const faltan = fotosQueFaltan(fotos);

  return (
    <Modal
      open={open}
      ocupado={guardando}
      title="Editar fotos del equipo"
      subtitle={equipo ? `${equipo.identificador} — ${equipo.categoria}` : ""}
      onClose={onClose}
    >
      <p className="campo-ayuda">
        {faltan > 0
          ? `El equipo debe quedar con 2 fotos: falta${faltan === 1 ? " 1" : "n 2"}.`
          : "Cambia la foto que necesites. La reemplazada queda guardada en el historial. No registra una inspección."}
      </p>
      <FotosEquipo actuales={equipo?.fotos || []} valor={fotos} onChange={setFotos} onProcesando={setProcesandoFoto} />
      {errorServidor && <p className="field-error" role="alert">{errorServidor}</p>}

      <ModalActions onCancel={onClose}>
        <BotonCarga cargando={guardando} textoCargando="Guardando fotos…" disabled={procesandoFoto} onClick={onGuardar}>
          Guardar fotos
        </BotonCarga>
      </ModalActions>
    </Modal>
  );
}
