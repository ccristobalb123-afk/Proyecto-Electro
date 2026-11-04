import { useState } from "react";
import { BotonCarga } from "../components/shared/Carga";
import { useSearchParams, Link } from "react-router-dom";
import AuthShell from "../components/auth/AuthShell";
import PasswordField from "../components/shared/PasswordField";
import PasswordStrength from "../components/shared/PasswordStrength";
import { MIN_LARGO_PASSWORD } from "../utils/password";
import { IconChevronLeft } from "../components/icons/Icons";
import * as authService from "../services/authService";
import * as c from "../components/auth/clasesAuth";

const PASOS = [
  { id: "nueva", etiqueta: "Nueva contraseña" },
  { id: "listo", etiqueta: "Listo" },
];

const MENSAJE_SIN_TOKEN = "Este enlace no es válido. Solicita uno nuevo desde la pantalla de inicio de sesión.";

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
      setError(MENSAJE_SIN_TOKEN);
      return;
    }
    if (passwordNueva.length < MIN_LARGO_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_LARGO_PASSWORD} caracteres.`);
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

  // Sin token el formulario no puede funcionar: el aviso se ve desde el principio.
  const mensajeError = error || (!token ? MENSAJE_SIN_TOKEN : "");

  return (
    <AuthShell flujo="restablecer" pasos={PASOS} actual={listo ? 1 : 0} paso={listo ? "listo" : "formulario"}>
      {listo ? (
        <div className={c.FORM}>
          <div className={c.ICONO_EXITO}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className={c.TITULO} tabIndex={-1}>
            Contraseña actualizada
          </h2>
          <p className={c.SUB}>Ya puedes iniciar sesión con tu contraseña nueva.</p>
          <Link className="btn-primary text-center" to="/login">
            Ir a iniciar sesión
          </Link>
        </div>
      ) : (
        <form className={c.FORM} onSubmit={handleSubmit}>
          <h2 className={c.TITULO} tabIndex={-1}>
            Crea una contraseña nueva
          </h2>
          <p className={c.SUB}>Elige una contraseña que no hayas usado antes.</p>

          <PasswordField
            id="passwordNueva"
            label="Contraseña nueva"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            autoComplete="new-password"
            autoFocus
            invalid={!!mensajeError}
            describedBy={mensajeError ? "restablecer-error" : undefined}
          >
            <PasswordStrength password={passwordNueva} />
          </PasswordField>

          <PasswordField
            id="confirmarNueva"
            label="Confirmar contraseña"
            value={confirmarNueva}
            onChange={(e) => setConfirmarNueva(e.target.value)}
            autoComplete="new-password"
            invalid={!!mensajeError}
            describedBy={mensajeError ? "restablecer-error" : undefined}
          />

          {mensajeError && (
            <p id="restablecer-error" className={c.ERROR} role="alert">
              {mensajeError}
            </p>
          )}

          <BotonCarga type="submit" cargando={loading} textoCargando="Guardando…" disabled={!token}>
            Guardar contraseña
          </BotonCarga>

          <Link className={`${c.VOLVER} auth-back--abajo`} to="/login">
            <IconChevronLeft width={16} height={16} /> Volver a inicio de sesión
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
