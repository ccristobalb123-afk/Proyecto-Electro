import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import PasswordStrength from "../components/shared/PasswordStrength";
import * as authService from "../services/authService";
import "./Login.css";

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
    <div className="login">
      <div className="login-brand">
        <div className="brand-mark">
          <div className="wordmark font-display">
            Activo<span>360</span>
          </div>
        </div>
        <div className="brand-copy">
          <h1 className="font-display">Un solo lugar para tus dos empresas.</h1>
          <p>
            RRHH, equipos, camiones y finanzas de CorevexSAC y ElectroSAC, con
            alertas de vencimiento automáticas.
          </p>
        </div>
      </div>

      <div className="login-form-wrap">
        {listo ? (
          <div className="login-form">
            <div className="step-icon success">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h2 className="font-display">Contraseña actualizada</h2>
            <p className="sub">Ya puedes iniciar sesión con tu contraseña nueva.</p>
            <Link className="btn-primary" to="/login" style={{ textAlign: "center", textDecoration: "none" }}>
              Ir a iniciar sesión
            </Link>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <h2 className="font-display">Crea una contraseña nueva</h2>
            <p className="sub">Elige una contraseña que no hayas usado antes.</p>

            <div className="field">
              <label htmlFor="passwordNueva">Contraseña nueva</label>
              <input
                type="password"
                id="passwordNueva"
                placeholder="••••••••"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                autoFocus
              />
              <div className="password-strength-wrap">
                <PasswordStrength password={passwordNueva} />
              </div>
            </div>

            <div className="field">
              <label htmlFor="confirmarNueva">Confirmar contraseña</label>
              <input
                type="password"
                id="confirmarNueva"
                placeholder="••••••••"
                value={confirmarNueva}
                onChange={(e) => setConfirmarNueva(e.target.value)}
              />
            </div>

            {error && <p className="field-error">{error}</p>}

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar contraseña"}
            </button>

            <Link className="back-link below" to="/login">
              ‹ Volver a inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
