import { useState } from "react";
import { BotonCarga } from "../components/shared/Carga";
import { useLoginFlow, LOGIN_STEPS as STEPS } from "../hooks/useLoginFlow";
import AuthShell from "../components/auth/AuthShell";
import OtpInput from "../components/auth/OtpInput";
import PasswordField from "../components/shared/PasswordField";
import { IconChevronLeft } from "../components/icons/Icons";
import { useAuth } from "../context/AuthContext";
import * as c from "../components/auth/clasesAuth";

// Por qué se volvió al login (ver AuthContext → motivoCierre).
const MENSAJES_CIERRE = {
  inactividad: "Tu sesión se cerró por inactividad.",
  maxima: "Por seguridad, tu sesión llegó a su duración máxima. Vuelve a iniciar sesión.",
  revocada: "Tu sesión se cerró desde otro dispositivo o por un administrador. Vuelve a iniciar sesión.",
  expirada: "Tu sesión expiró. Vuelve a iniciar sesión.",
};

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
  const { motivoCierre } = useAuth();

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
    <p id="login-error" className={c.ERROR} role="alert">
      {l.error}
    </p>
  );

  return (
    <AuthShell flujo={flujo} pasos={pasos} actual={actual} paso={l.step}>
      {l.step === STEPS.CREDENTIALS && (
        <form className={c.FORM} onSubmit={l.handleCredentialsSubmit}>
          <h2 className={c.TITULO} tabIndex={-1}>
            Inicia sesión
          </h2>
          <p className={c.SUB}>Ingresa tus credenciales para continuar.</p>
          {MENSAJES_CIERRE[motivoCierre] && (
            <p className={c.AVISO} role="status">
              {MENSAJES_CIERRE[motivoCierre]}
            </p>
          )}
          <div className={c.CAMPO}>
            <label htmlFor="usuario" className={c.CAMPO_LABEL}>Usuario</label>
            <input
              type="text"
              id="usuario"
              className={c.CAMPO_INPUT}
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
          <BotonCarga type="submit" cargando={l.loading} textoCargando="Verificando…">
            Continuar
          </BotonCarga>
          <button type="button" className={`${c.VOLVER} auth-back--abajo`} onClick={() => l.irAPaso(STEPS.RECOVERY)}>
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      )}

      {l.step === STEPS.MFA_SETUP && (
        <div className={c.FORM}>
          <button type="button" className={c.VOLVER} onClick={() => l.irAPaso(STEPS.CREDENTIALS)}>
            <IconChevronLeft width={16} height={16} /> Volver
          </button>
          <div className={c.ICONO_PASO}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h2 className={c.TITULO} tabIndex={-1}>
            Configura la verificación en dos pasos
          </h2>
          <p className={c.SUB}>
            Escanea este código con Google Authenticator, Authy o cualquier app similar en tu celular.
          </p>
          {l.qrDataUrl && (
            <img
              src={l.qrDataUrl}
              alt="Código QR para configurar la verificación en dos pasos"
              // bg-[#fff] y no bg-card: el QR necesita fondo blanco para leerse, sin
              // importar el tema.
              className="mx-auto mt-2 mb-5 block size-[180px] rounded border border-border bg-[#fff] p-2.5"
            />
          )}
          <button className="btn-primary" type="button" onClick={l.handleContinuarDesdeSetup}>
            Ya lo escaneé, continuar
          </button>
        </div>
      )}

      {l.step === STEPS.MFA && (
        <form className={c.FORM} onSubmit={l.handleMfaSubmit}>
          <button type="button" className={c.VOLVER} onClick={() => l.irAPaso(STEPS.CREDENTIALS)}>
            <IconChevronLeft width={16} height={16} /> Volver
          </button>
          <div className={c.ICONO_PASO}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>
          <h2 className={c.TITULO} tabIndex={-1}>
            Verificación en dos pasos
          </h2>
          <p className={c.SUB}>Ingresa el código de tu app de autenticación.</p>
          <OtpInput
            otp={l.otp}
            onChange={l.handleOtpChange}
            setOtp={l.setOtp}
            invalid={!!l.error}
            describedBy={errorId}
          />
          {mensajeError}
          <BotonCarga type="submit" cargando={l.loading} textoCargando="Verificando…">
            Verificar y entrar
          </BotonCarga>
        </form>
      )}

      {l.step === STEPS.RECOVERY && (
        <form className={c.FORM} onSubmit={l.handleRecoverySubmit}>
          <button type="button" className={c.VOLVER} onClick={() => l.irAPaso(STEPS.CREDENTIALS)}>
            <IconChevronLeft width={16} height={16} /> Volver a inicio de sesión
          </button>
          <div className={c.ICONO_PASO}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </div>
          <h2 className={c.TITULO} tabIndex={-1}>
            Recuperar contraseña
          </h2>
          <p className={c.SUB}>Ingresa tu correo y te enviamos un enlace para restablecerla.</p>
          <div className={c.CAMPO}>
            <label htmlFor="correoRecovery" className={c.CAMPO_LABEL}>Correo</label>
            <input
              type="email"
              id="correoRecovery"
              className={c.CAMPO_INPUT}
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
          <BotonCarga type="submit" cargando={l.loading} textoCargando="Enviando…">
            Enviar enlace
          </BotonCarga>
        </form>
      )}

      {l.step === STEPS.RECOVERY_SENT && (
        <div className={c.FORM}>
          <div className={c.ICONO_EXITO}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className={c.TITULO} tabIndex={-1}>
            Revisa tu correo
          </h2>
          <p className={c.SUB}>
            Si ese correo existe en el sistema, te llegará un enlace para crear una nueva contraseña. El enlace vence
            en 30 minutos.
          </p>
          <button type="button" className={c.VOLVER} onClick={() => l.irAPaso(STEPS.CREDENTIALS)}>
            <IconChevronLeft width={16} height={16} /> Volver a inicio de sesión
          </button>
        </div>
      )}
    </AuthShell>
  );
}
