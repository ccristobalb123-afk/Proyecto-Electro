import { useState } from "react";
import { Modal, ModalActions } from "../shared/Modal";
import { IconClipboardCheck } from "../icons/Icons";

const CAJA = "mb-2.5 flex items-center gap-2.5 rounded border border-border bg-paper px-4 py-3.5";
// [font-family:…] y no font-mono: .font-mono va sin capa en tokens.css (ver docs/tailwind.md).
const VALOR = "flex-1 [font-family:var(--font-mono)] text-[16px] font-semibold tracking-[0.03em] text-text";
const AYUDA = "mx-0 mt-0 mb-3.5 text-[12px] text-muted";
const AVISO = "mb-3.5 flex items-center gap-2 rounded bg-danger-tint px-3 py-2.5 text-[12.5px] text-danger-dark";

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
      <div className={CAJA}>
        <code className={VALOR}>{password}</code>
        <button className="btn-outline-sm" type="button" onClick={copiar}>
          {copiado ? "¡Copiada!" : "Copiar"}
        </button>
      </div>

      <p className={AYUDA}>
        Compártela con la persona por un medio seguro — no se va a volver a mostrar.
      </p>

      {correoEnviado === false && (
        <div className={AVISO}>
          <IconClipboardCheck width={15} height={15} />
          No se pudo enviar por correo — esta pantalla es la única forma de dársela por ahora.
        </div>
      )}

      <ModalActions onCancel={onClose} cancelLabel="Cerrar" />
    </Modal>
  );
}
