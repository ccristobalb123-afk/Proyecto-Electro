import { useState } from "react";
import { useLoginFlow, LOGIN_STEPS as STEPS } from "../hooks/useLoginFlow";
import AuthShell from "../components/auth/AuthShell";
import OtpInput from "../components/auth/OtpInput";
import PasswordField from "../components/shared/PasswordField";
import { IconChevronLeft } from "../components/icons/Icons";

// Pasos del riel. "Verificación" solo existe si el sistema pide MFA, y eso se
// sabe recién después de validar las credenciales: por eso el riel arranca con
// un nodo y crece cuando hace falta.
const PASO_CREDENCIALES = { id: "credenciales", etiqueta: "Credenciales" };
const PASO_VERIFICACION = { id: "verificacion", etiqueta: "Verificación" };
const PASOS_RECUPERACION = [
  { id: "correo", etiqueta: "Correo" },
  { id: "enlace", etiqueta: "Enlace enviado" },
];

export default function Login() {
  const l = useLoginFlow();

  const enRecuperacion = l.step === STEPS.RECOVERY || l.step === STEPS.RECOVERY_SENT;
  const enMfa = l.step === STEPS.MFA_SETUP || l.step === STEPS.MFA;

  // Una vez que apareció el nodo de verificación se queda: si la persona vuelve
  // a las credenciales, el trazo retrocede por el mismo camino en vez de
  // desaparecer el nodo.
  const [conMfa, setConMfa] = useState(false);
  if (enMfa && !conMfa) setConMfa(true);

  const flujo = enRecuperacion ? "recuperacion" : "login";
  const pasos = enRecuperacion
    ? PASOS_RECUPERACION
    : conMfa
      ? [PASO_CREDENCIALES, PASO_VERIFICACION]
      : [PASO_CREDENCIALES];
  const actual = enRecuperacion ? (l.step === STEPS.RECOVERY_SENT ? 1 : 0) : enMfa ? 1 : 0;

  const errorId = l.error ? "login-error" : undefined;
  const mensajeError = l.error && (
    <p id="login-error" className="auth-error" role="alert">
      {l.error}
    </p>
  );

  return (
    <AuthShell flujo={flujo} pasos={pasos} actual={actual} paso={l.step}>
      {l.step === STEPS.CREDENTIALS && (
        <form className="auth-form" onSubmit={l.handleCredentialsSubmit}>
          <h2 className="font-display" tabIndex={-1}>
            Inicia sesión
          </h2>
          <p className="auth-sub">Ingresa tus credenciales para continuar.</p>
          <div className="auth-field">
            <label htmlFor="usuario">Usuario</label>
            <input
              type="text"
              id="usuario"
              name="usuario"
              placeholder="Ej. ccorahua"
              value={l.usuario}
              onChange={(e) => l.setUsuario(e.target.value)}
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={l.error ? true : undefined}
              aria-describedby={errorId}
            />
          </div>
          <PasswordField
            id="clave"
            name="clave"
            label="Contraseña"
            value={l.clave}
            onChange={(e) => l.setClave(e.target.value)}
            autoComplete="current-password"
            invalid={!!l.error}
            describedBy={errorId}
          />
          {mensajeError}
          <button className="btn-primary" type="submit" disabled={l.loading}>
            {l.loading ? "Verificando..." : "Continuar"}
          </button>
          <button type="button" className="auth-back auth-back--abajo" onClick={() => l.irAPaso(STEPS.RECOVERY)}>
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      )}

      {l.step === STEPS.MFA_SETUP && (
        <div className="auth-form">
          <button type="button" className="auth-back" onClick={() => l.irAPaso(STEPS.CREDENTIALS)}>
            <IconChevronLeft width={16} height={16} /> Volver
          </button>
          <div className="auth-step-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h2 className="font-display" tabIndex={-1}>
            Configura la verificación en dos pasos
          </h2>
          <p className="auth-sub">
            Escanea este código con Google Authenticator, Authy o cualquier app similar en tu celular.
          </p>
          {l.qrDataUrl && (
            <img src={l.qrDataUrl} alt="Código QR para configurar la verificación en dos pasos" className="auth-qr" />
          )}
          <button className="btn-primary" type="button" onClick={l.handleContinuarDesdeSetup}>
            Ya lo escaneé, continuar
          </button>
        </div>
      )}

      {l.step === STEPS.MFA && (
        <form className="auth-form" onSubmit={l.handleMfaSubmit}>
          <button type="button" className="auth-back" onClick={() => l.irAPaso(STEPS.CREDENTIALS)}>
            <IconChevronLeft width={16} height={16} /> Volver
          </button>
          <div className="auth-step-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>
          <h2 className="font-display" tabIndex={-1}>
            Verificación en dos pasos
          </h2>
          <p className="auth-sub">Ingresa el código de tu app de autenticación.</p>
          <OtpInput
            otp={l.otp}
            onChange={l.handleOtpChange}
            setOtp={l.setOtp}
            invalid={!!l.error}
            describedBy={errorId}
          />
          {mensajeError}
          <button className="btn-primary" type="submit" disabled={l.loading}>
            {l.loading ? "Verificando..." : "Verificar y entrar"}
          </button>
        </form>
      )}

      {l.step === STEPS.RECOVERY && (
        <form className="auth-form" onSubmit={l.handleRecoverySubmit}>
          <button type="button" className="auth-back" onClick={() => l.irAPaso(STEPS.CREDENTIALS)}>
            <IconChevronLeft width={16} height={16} /> Volver a inicio de sesión
          </button>
          <div className="auth-step-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </div>
          <h2 className="font-display" tabIndex={-1}>
            Recuperar contraseña
          </h2>
          <p className="auth-sub">Ingresa tu correo y te enviamos un enlace para restablecerla.</p>
          <div className="auth-field">
            <label htmlFor="correoRecovery">Correo</label>
            <input
              type="email"
              id="correoRecovery"
              placeholder="nombre@corevex.pe"
              value={l.correoRecovery}
              onChange={(e) => l.setCorreoRecovery(e.target.value)}
              autoFocus
              autoComplete="email"
              aria-invalid={l.error ? true : undefined}
              aria-describedby={errorId}
            />
          </div>
          {mensajeError}
          <button className="btn-primary" type="submit" disabled={l.loading}>
            {l.loading ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>
      )}

      {l.step === STEPS.RECOVERY_SENT && (
        <div className="auth-form">
          <div className="auth-step-icon auth-step-icon--exito">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className="font-display" tabIndex={-1}>
            Revisa tu correo
          </h2>
          <p className="auth-sub">
            Si ese correo existe en el sistema, te llegará un enlace para crear una nueva contraseña. El enlace vence
            en 30 minutos.
          </p>
          <button type="button" className="auth-back" onClick={() => l.irAPaso(STEPS.CREDENTIALS)}>
            <IconChevronLeft width={16} height={16} /> Volver a inicio de sesión
          </button>
        </div>
      )}
    </AuthShell>
  );
}
