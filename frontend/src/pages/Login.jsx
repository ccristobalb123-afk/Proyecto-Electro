import { useLoginFlow, LOGIN_STEPS as STEPS } from "../hooks/useLoginFlow";
import "./Login.css";

function CircuitPattern() {
  return (
    <svg className="circuit" viewBox="0 0 500 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g stroke="#F0B429" strokeWidth="1.5" fill="none">
        <path d="M20 40 H140 V120 H260" />
        <path d="M260 120 V220 H400" />
        <path d="M40 200 H160 V320" />
        <path d="M160 320 H60 V420" />
        <path d="M300 260 V380 H180" />
        <path d="M180 380 V500" />
        <path d="M400 220 V340 H480" />
        <path d="M60 420 H220 V560" />
        <path d="M220 560 H360 V680" />
        <path d="M0 600 H100 V720" />
        <path d="M300 500 H440 V620" />
      </g>
      <g fill="#F0B429">
        <circle cx="20" cy="40" r="4" />
        <circle cx="140" cy="40" r="4" />
        <circle cx="260" cy="120" r="4" />
        <circle cx="400" cy="220" r="4" />
        <circle cx="160" cy="320" r="4" />
        <circle cx="60" cy="420" r="4" />
        <circle cx="300" cy="260" r="4" />
        <circle cx="180" cy="500" r="4" />
        <circle cx="480" cy="340" r="4" />
        <circle cx="220" cy="560" r="4" />
        <circle cx="360" cy="680" r="4" />
        <circle cx="100" cy="720" r="4" />
        <circle cx="440" cy="620" r="4" />
      </g>
    </svg>
  );
}

export default function Login() {
  const l = useLoginFlow();

  return (
    <div className="login">
      <div className="login-brand">
        <CircuitPattern />
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
        <div className="brand-footer">
          <span className="pill">CorevexSAC</span>
          <span className="pill">ElectroSAC</span>
        </div>
      </div>

      <div className="login-form-wrap">
        {l.step === STEPS.CREDENTIALS && (
          <form className="login-form" onSubmit={l.handleCredentialsSubmit}>
            <h2 className="font-display">Inicia sesión</h2>
            <p className="sub">Ingresa tus credenciales para continuar.</p>
            <div className="field">
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
              />
            </div>
            <div className="field">
              <label htmlFor="clave">Contraseña</label>
              <input
                type="password"
                id="clave"
                name="clave"
                placeholder="••••••••"
                value={l.clave}
                onChange={(e) => l.setClave(e.target.value)}
              />
            </div>
            {l.error && <p className="field-error">{l.error}</p>}
            <button className="btn-primary" type="submit" disabled={l.loading}>
              {l.loading ? "Verificando..." : "Continuar"}
            </button>
            <button
              type="button"
              className="back-link below"
              onClick={() => l.irAPaso(STEPS.RECOVERY)}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {l.step === STEPS.MFA_SETUP && (
          <div className="login-form">
            <button
              type="button"
              className="back-link"
              onClick={() => l.irAPaso(STEPS.CREDENTIALS)}
            >
              ‹ Volver
            </button>
            <div className="step-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <h2 className="font-display">Configura la verificación en dos pasos</h2>
            <p className="sub">
              Escanea este código con Google Authenticator, Authy o cualquier app similar en tu celular.
            </p>
            {l.qrDataUrl && (
              <img src={l.qrDataUrl} alt="Código QR para configurar la verificación en dos pasos" className="mfa-qr" />
            )}
            <button className="btn-primary" type="button" onClick={l.handleContinuarDesdeSetup}>
              Ya lo escaneé, continuar
            </button>
          </div>
        )}

        {l.step === STEPS.MFA && (
          <form className="login-form" onSubmit={l.handleMfaSubmit}>
            <button
              type="button"
              className="back-link"
              onClick={() => l.irAPaso(STEPS.CREDENTIALS)}
            >
              ‹ Volver
            </button>
            <div className="step-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
            <h2 className="font-display">Verificación en dos pasos</h2>
            <p className="sub">Ingresa el código de tu app de autenticación.</p>
            <div className="otp-row">
              {l.otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  aria-label={`Dígito ${i + 1} del código`}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => l.handleOtpChange(i, e.target.value)}
                  inputMode="numeric"
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {l.error && <p className="field-error">{l.error}</p>}
            <button className="btn-primary" type="submit" disabled={l.loading}>
              {l.loading ? "Verificando..." : "Verificar y entrar"}
            </button>
          </form>
        )}

        {l.step === STEPS.RECOVERY && (
          <form className="login-form" onSubmit={l.handleRecoverySubmit}>
            <button
              type="button"
              className="back-link"
              onClick={() => l.irAPaso(STEPS.CREDENTIALS)}
            >
              ‹ Volver a inicio de sesión
            </button>
            <div className="step-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </div>
            <h2 className="font-display">Recuperar contraseña</h2>
            <p className="sub">
              Ingresa tu correo y te enviamos un enlace para restablecerla.
            </p>
            <div className="field">
              <label htmlFor="correoRecovery">Correo</label>
              <input
                type="email"
                id="correoRecovery"
                placeholder="nombre@corevex.pe"
                value={l.correoRecovery}
                onChange={(e) => l.setCorreoRecovery(e.target.value)}
                autoFocus
              />
            </div>
            <button className="btn-primary" type="submit" disabled={l.loading}>
              {l.loading ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        )}

        {l.step === STEPS.RECOVERY_SENT && (
          <div className="login-form">
            <div className="step-icon success">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h2 className="font-display">Revisa tu correo</h2>
            <p className="sub">
              Si ese correo existe en el sistema, te llegará un enlace para
              crear una nueva contraseña. El enlace vence en 30 minutos.
            </p>
            <button
              type="button"
              className="back-link"
              onClick={() => l.irAPaso(STEPS.CREDENTIALS)}
            >
              ‹ Volver a inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
