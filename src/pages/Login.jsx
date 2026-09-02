import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as authService from "../services/authService";
import "./Login.css";

const STEPS = {
  CREDENTIALS: "credentials",
  MFA: "mfa",
  RECOVERY: "recovery",
  RECOVERY_SENT: "recovery_sent",
};

function CircuitPattern() {
  return (
    <svg className="circuit" viewBox="0 0 500 800" preserveAspectRatio="xMidYMid slice">
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
  const navigate = useNavigate();
  const { login, verificarMfa } = useAuth();
  const [step, setStep] = useState(STEPS.CREDENTIALS);
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [correoRecovery, setCorreoRecovery] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ---- Paso 1: credenciales ----
  async function handleCredentialsSubmit(e) {
    e.preventDefault();
    setError("");

    // Se lee directo del formulario (FormData) en vez de solo del estado:
    // si el navegador autocompletó los campos, el evento onChange de React
    // puede no dispararse, y el estado se quedaría vacío aunque el campo
    // se vea lleno en pantalla.
    const formData = new FormData(e.target);
    const correoVal = (formData.get("correo") || "").trim();
    const claveVal = formData.get("clave") || "";

    if (!correoVal || !claveVal) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }
    setCorreo(correoVal);
    setClave(claveVal);
    setLoading(true);
    try {
      const resultado = await login(correoVal, claveVal);
      if (resultado.requiereMfa) {
        setStep(STEPS.MFA);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  // ---- Paso 2: MFA ----
  function handleOtpChange(index, value) {
    if (!/^\d?$/.test(value)) return; // solo un dígito
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  }

  async function handleMfaSubmit(e) {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length < 6) {
      setError("Ingresa el código completo de 6 dígitos.");
      return;
    }
    setLoading(true);
    try {
      await verificarMfa(correo, code);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Código incorrecto o vencido.");
    } finally {
      setLoading(false);
    }
  }

  // ---- Recuperación de contraseña ----
  async function handleRecoverySubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO backend: POST /api/auth/forgot-password { correo }
      // Respuesta siempre genérica (no confirmar si el correo existe).
      await authService.recuperarPassword(correoRecovery);
      setStep(STEPS.RECOVERY_SENT);
    } finally {
      setLoading(false);
    }
  }

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
        {step === STEPS.CREDENTIALS && (
          <form className="login-form" onSubmit={handleCredentialsSubmit}>
            <h2 className="font-display">Inicia sesión</h2>
            <p className="sub">Ingresa tus credenciales para continuar.</p>
            <div className="field">
              <label htmlFor="correo">Correo</label>
              <input
                type="email"
                id="correo"
                name="correo"
                placeholder="nombre@corevex.pe"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="clave">Contraseña</label>
              <input
                type="password"
                id="clave"
                name="clave"
                placeholder="••••••••"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
              />
            </div>
            {error && <p className="field-error">{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Verificando..." : "Continuar"}
            </button>
            <button
              type="button"
              className="back-link below"
              onClick={() => {
                setError("");
                setStep(STEPS.RECOVERY);
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {step === STEPS.MFA && (
          <form className="login-form" onSubmit={handleMfaSubmit}>
            <button
              type="button"
              className="back-link"
              onClick={() => {
                setError("");
                setStep(STEPS.CREDENTIALS);
              }}
            >
              ‹ Volver
            </button>
            <div className="step-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
            <h2 className="font-display">Verificación en dos pasos</h2>
            <p className="sub">Ingresa el código de tu app de autenticación.</p>
            <div className="otp-row">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  inputMode="numeric"
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {error && <p className="field-error">{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Verificando..." : "Verificar y entrar"}
            </button>
          </form>
        )}

        {step === STEPS.RECOVERY && (
          <form className="login-form" onSubmit={handleRecoverySubmit}>
            <button
              type="button"
              className="back-link"
              onClick={() => setStep(STEPS.CREDENTIALS)}
            >
              ‹ Volver a inicio de sesión
            </button>
            <div className="step-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
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
                value={correoRecovery}
                onChange={(e) => setCorreoRecovery(e.target.value)}
                autoFocus
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        )}

        {step === STEPS.RECOVERY_SENT && (
          <div className="login-form">
            <div className="step-icon success">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
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
              onClick={() => setStep(STEPS.CREDENTIALS)}
            >
              ‹ Volver a inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
