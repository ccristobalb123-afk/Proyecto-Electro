import { useState } from "react";
import { Modal, ModalActions } from "./Modal";
import { BotonCarga } from "./Carga";
import PasswordField from "./PasswordField";
import PasswordStrength from "./PasswordStrength";
import { MIN_LARGO_PASSWORD } from "../../utils/password";
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

    if (!passwordNueva || passwordNueva.length < MIN_LARGO_PASSWORD) {
      setError(`La nueva contraseña debe tener al menos ${MIN_LARGO_PASSWORD} caracteres.`);
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
      variant="seguridad"
      ocupado={guardando}
      title="Cambiar contraseña"
      subtitle={
        obligatorio ? "Por seguridad, tienes que cambiar tu contraseña antes de seguir." : undefined
      }
      onClose={obligatorio ? undefined : onClose}
    >
      <form onSubmit={handleSubmit}>
        {!obligatorio && (
          <PasswordField
            id="passwordActual"
            label="Contraseña actual"
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            autoComplete="current-password"
            required
          />
        )}
        <PasswordField
          id="passwordNueva"
          label="Contraseña nueva"
          value={passwordNueva}
          onChange={(e) => setPasswordNueva(e.target.value)}
          autoComplete="new-password"
          required
        >
          <PasswordStrength password={passwordNueva} />
        </PasswordField>
        <PasswordField
          id="confirmarNueva"
          label="Confirmar contraseña nueva"
          value={confirmarNueva}
          onChange={(e) => setConfirmarNueva(e.target.value)}
          autoComplete="new-password"
          required
        />
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        {obligatorio ? (
          <div className="modal-actions">
            <BotonCarga type="submit" cargando={guardando} textoCargando="Guardando…">
              Guardar nueva contraseña
            </BotonCarga>
          </div>
        ) : (
          <ModalActions onCancel={onClose}>
            <BotonCarga type="submit" cargando={guardando} textoCargando="Guardando…">
              Guardar nueva contraseña
            </BotonCarga>
          </ModalActions>
        )}
      </form>
    </Modal>
  );
}
