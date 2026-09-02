import { useState } from "react";
import { Modal, ModalActions } from "./Modal";
import PasswordStrength from "./PasswordStrength";
import * as authService from "../../services/authService";

// TODO backend: POST /api/auth/cambiar-password { passwordActual, passwordNueva }
// (o el flujo que corresponda si es un cambio obligatorio del primer login).
export default function CambiarPasswordModal({ open, obligatorio, onClose, onExito }) {
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmarNueva, setConfirmarNueva] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!passwordNueva || passwordNueva.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (passwordNueva !== confirmarNueva) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setGuardando(true);
    try {
      await authService.cambiarPassword(passwordActual, passwordNueva);
      onExito?.();
    } catch (err) {
      setError(err.message || "No se pudo cambiar la contraseña. Verifica tu contraseña actual.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Cambiar contraseña"
      subtitle={
        obligatorio ? "Por seguridad, tienes que cambiar tu contraseña antes de seguir." : undefined
      }
      onClose={obligatorio ? undefined : onClose}
    >
      <form onSubmit={handleSubmit}>
        {!obligatorio && (
          <div className="form-field">
            <label htmlFor="passwordActual">Contraseña actual</label>
            <input
              type="password"
              id="passwordActual"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              required
            />
          </div>
        )}
        <div className="form-field">
          <label htmlFor="passwordNueva">Contraseña nueva</label>
          <input
            type="password"
            id="passwordNueva"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            required
          />
          <div style={{ marginTop: 8 }}>
            <PasswordStrength password={passwordNueva} />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="confirmarNueva">Confirmar contraseña nueva</label>
          <input
            type="password"
            id="confirmarNueva"
            value={confirmarNueva}
            onChange={(e) => setConfirmarNueva(e.target.value)}
            required
          />
        </div>
        {error && <p className="field-error">{error}</p>}
        {obligatorio ? (
          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </div>
        ) : (
          <ModalActions onCancel={onClose}>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </ModalActions>
        )}
      </form>
    </Modal>
  );
}
