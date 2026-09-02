import { Modal, Timeline } from "../shared/Modal";
import Loading from "../shared/Loading";

export default function ModalHistorialOperaciones({ open, seleccionado, cargando, items, onClose }) {
  return (
    <Modal
      open={open}
      title={seleccionado ? `Hoja de vida — ${seleccionado.codigo || seleccionado.placa}` : ""}
      subtitle={seleccionado ? seleccionado.categoria || seleccionado.tipoUnidad : ""}
      onClose={onClose}
    >
      {cargando ? <Loading texto="Cargando..." /> : <Timeline items={items} />}
    </Modal>
  );
}
