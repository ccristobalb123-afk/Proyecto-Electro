import { Modal, ModalActions } from "../shared/Modal";
import { useState } from "react";
import { BotonCarga } from "../shared/Carga";
import FotosEquipo from "./FotosEquipo";

export default function ModalEditarFotosEquipo({ open, equipo, fotos, setFotos, onClose, onGuardar, guardando, errorServidor }) {
  const [procesandoFoto, setProcesandoFoto] = useState(false);

  return (
    <Modal
      open={open}
      ocupado={guardando}
      title="Editar fotos del equipo"
      subtitle={equipo ? `${equipo.codigo} — ${equipo.categoria}` : ""}
      onClose={onClose}
    >
      <FotosEquipo fotos={fotos} onChange={setFotos} onProcesando={setProcesandoFoto} />
      {errorServidor && <p className="field-error" role="alert">{errorServidor}</p>}

      <ModalActions onCancel={onClose}>
        <BotonCarga cargando={guardando} textoCargando="Guardando fotos…" disabled={procesandoFoto} onClick={onGuardar}>
          Guardar fotos
        </BotonCarga>
      </ModalActions>
    </Modal>
  );
}
