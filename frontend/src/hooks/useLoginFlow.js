import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as authService from "../services/authService";

export const LOGIN_STEPS = {
  CREDENTIALS: "credentials",
  MFA_SETUP: "mfa_setup",
  MFA: "mfa",
  RECOVERY: "recovery",
  RECOVERY_SENT: "recovery_sent",
};

// Toda la lógica del flujo de login (credenciales -> configurar MFA (solo
// la primera vez) -> MFA -> recuperación) — antes vivía dentro de
// Login.jsx mezclada con el JSX de cada paso. La llamada real a la API
// sigue en AuthContext (login/verificarMfa), acá solo se orquesta en
// qué paso estamos y el estado de cada form.
//
// El correo NUNCA sirve para loguearse — solo el nombre de usuario. El
// correo solo se usa en el paso de "olvidé mi contraseña" (variables
// `correoRecovery` más abajo), por eso son 2 campos separados.
export function useLoginFlow() {
  const navigate = useNavigate();
  const { login, verificarMfa } = useAuth();
  const [step, setStep] = useState(LOGIN_STEPS.CREDENTIALS);
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [correoRecovery, setCorreoRecovery] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Prueba de que ya se pasó por el paso 1 (contraseña correcta) — lo
  // exigen tanto mfa-setup como verify-mfa, en vez de confiar en el
  // nombre de usuario que mandaba antes cualquiera sin autenticarse.
  const [mfaToken, setMfaToken] = useState(null);

  // Solo se llena cuando hay que mostrar el QR (primera vez que un
  // Administrador nuevo inicia sesión y todavía no activó MFA).
  const [qrDataUrl, setQrDataUrl] = useState(null);

  function irAPaso(nuevoStep) {
    setError("");
    setStep(nuevoStep);
  }

  // ---- Paso 1: credenciales ----
  async function handleCredentialsSubmit(e) {
    e.preventDefault();
    setError("");

    // Se lee directo del formulario (FormData) en vez de solo del estado:
    // si el navegador autocompletó los campos, el evento onChange de React
    // puede no dispararse, y el estado se quedaría vacío aunque el campo
    // se vea lleno en pantalla.
    const formData = new FormData(e.target);
    const usuarioVal = (formData.get("usuario") || "").trim();
    const claveVal = formData.get("clave") || "";

    if (!usuarioVal || !claveVal) {
      setError("Ingresa tu usuario y contraseña.");
      return;
    }
    setUsuario(usuarioVal);
    setClave(claveVal);
    setLoading(true);
    try {
      const resultado = await login(usuarioVal, claveVal);
      if (!resultado.requiereMfa) {
        navigate("/dashboard");
        return;
      }

      if (resultado.mfaConfigurado) {
        setMfaToken(resultado.mfaToken);
        setStep(LOGIN_STEPS.MFA);
      } else {
        // Primera vez: hay que mostrarle el QR antes de pedirle un código.
        setMfaToken(resultado.mfaToken);
        const { otpauthUrl } = await authService.iniciarConfiguracionMfa(resultado.mfaToken);
        // qrcode solo se necesita la primera vez que alguien configura MFA: se descarga
        // en ese momento y no viaja con el chunk del Login de todos los demás.
        const { default: QRCode } = await import("qrcode");
        const dataUrl = await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 1 });
        setQrDataUrl(dataUrl);
        setStep(LOGIN_STEPS.MFA_SETUP);
      }
    } catch (err) {
      setError(err.message || "Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  // ---- Paso 2 (solo primera vez): mostrar el QR ----
  function handleContinuarDesdeSetup() {
    setStep(LOGIN_STEPS.MFA);
  }

  // ---- Paso 3: código de 6 dígitos ----
  // El primer código correcto activa MFA del lado del servidor — no
  // hace falta un paso aparte de "confirmar activación".
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
      await verificarMfa(mfaToken, code);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Código incorrecto o vencido.");
    } finally {
      setLoading(false);
    }
  }

  // ---- Recuperación de contraseña (por correo) ----
  async function handleRecoverySubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // Respuesta siempre genérica (no confirma si el correo existe).
      await authService.recuperarPassword(correoRecovery);
      setStep(LOGIN_STEPS.RECOVERY_SENT);
    } finally {
      setLoading(false);
    }
  }

  return {
    step, irAPaso,
    usuario, setUsuario,
    clave, setClave,
    correoRecovery, setCorreoRecovery,
    otp, setOtp, handleOtpChange,
    error, loading,
    qrDataUrl, handleContinuarDesdeSetup,
    handleCredentialsSubmit, handleMfaSubmit, handleRecoverySubmit,
  };
}
