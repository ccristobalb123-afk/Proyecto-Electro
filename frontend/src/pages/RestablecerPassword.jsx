import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import AuthShell from "../components/auth/AuthShell";
import PasswordField from "../components/shared/PasswordField";
import PasswordStrength from "../components/shared/PasswordStrength";
import { IconChevronLeft } from "../components/icons/Icons";
import * as authService from "../services/authService";

const PASOS = [
  { id: "nueva", etiqueta: "Nueva contraseña" },
  { id: "listo", etiqueta: "Listo" },
];

export default function RestablecerPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmarNueva, setConfirmarNueva] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [listo, setListo] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Este enlace no es válido. Solicita uno nuevo desde la pantalla de inicio de sesión.");
      return;
    }
    if (passwordNueva.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (passwordNueva !== confirmarNueva) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await authService.restablecerPassword(token, passwordNueva);
      setListo(true);
    } catch (err) {
      setError(err.message || "El enlace es inválido o ya venció. Solicita uno nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell flujo="restablecer" pasos={PASOS} actual={listo ? 1 : 0} paso={listo ? "listo" : "formulario"}>
      {listo ? (
        <div className="auth-form">
          <div className="auth-step-icon auth-step-icon--exito">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className="font-display" tabIndex={-1}>
            Contraseña actualizada
          </h2>
          <p className="auth-sub">Ya puedes iniciar sesión con tu contraseña nueva.</p>
          <Link className="btn-primary auth-link-btn" to="/login">
            Ir a iniciar sesión
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 className="font-display" tabIndex={-1}>
            Crea una contraseña nueva
          </h2>
          <p className="auth-sub">Elige una contraseña que no hayas usado antes.</p>

          <PasswordField
            id="passwordNueva"
            label="Contraseña nueva"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            autoComplete="new-password"
            autoFocus
            invalid={!!error}
            describedBy={error ? "restablecer-error" : undefined}
          >
            <PasswordStrength password={passwordNueva} />
          </PasswordField>

          <PasswordField
            id="confirmarNueva"
            label="Confirmar contraseña"
            value={confirmarNueva}
            onChange={(e) => setConfirmarNueva(e.target.value)}
            autoComplete="new-password"
            invalid={!!error}
            describedBy={error ? "restablecer-error" : undefined}
          />

          {error && (
            <p id="restablecer-error" className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar contraseña"}
          </button>

          <Link className="auth-back auth-back--abajo" to="/login">
            <IconChevronLeft width={16} height={16} /> Volver a inicio de sesión
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
