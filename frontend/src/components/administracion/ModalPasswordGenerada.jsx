import { useState } from "react";
import { Modal, ModalActions } from "../shared/Modal";
import { IconClipboardCheck } from "../icons/Icons";

// Se muestra justo después de crear un usuario o resetear su
// contraseña — antes esa contraseña temporal solo se mandaba por
// correo, así que si el SMTP no estaba configurado (como en desarrollo)
// no había ninguna forma de saber cuál era.
export default function ModalPasswordGenerada({ open, onClose, nombreUsuario, password, correoEnviado }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(password);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <Modal open={open} title="Contraseña generada" subtitle={`Para el usuario "${nombreUsuario}"`} onClose={onClose}>
      <div className="password-generada-box">
        <code className="password-generada-valor">{password}</code>
        <button className="btn-outline-sm" type="button" onClick={copiar}>
          {copiado ? "¡Copiada!" : "Copiar"}
        </button>
      </div>

      <p className="password-generada-hint">
        Compártela con la persona por un medio seguro — no se va a volver a mostrar.
      </p>

      {correoEnviado === false && (
        <div className="password-generada-aviso">
          <IconClipboardCheck width={15} height={15} />
          No se pudo enviar por correo — esta pantalla es la única forma de dársela por ahora.
        </div>
      )}

      <ModalActions onCancel={onClose} cancelLabel="Cerrar" />
    </Modal>
  );
}
