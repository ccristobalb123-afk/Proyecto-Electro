import { useEffect, useRef } from "react";
import AuthRail from "./AuthRail";
import "./AuthShell.css";
import "./AuthForm.css";

// Dibujo decorativo del panel: estático y muy tenue, para que el riel sea lo
// único brillante. Antes vivía en Login.jsx con el color escrito a mano.
function CircuitoDeFondo() {
  return (
    <svg className="auth-fondo" viewBox="0 0 500 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.5" fill="none">
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
      <g fill="currentColor">
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

/**
 * Carcasa compartida del Login y de "Restablecer contraseña": panel navy con
 * el riel y, a la derecha, la zona del formulario.
 *
 * - `flujo` identifica el recorrido (login, recuperación…). Al cambiar, el
 *   riel se vuelve a montar; dentro de un mismo flujo solo se mueve el trazo.
 * - `paso` identifica el contenido visible: al cambiar, entra con un fundido
 *   corto. El formulario se ancla arriba (no se centra en vertical), así que
 *   lo de arriba no se mueve entre pasos y no hace falta animar ninguna altura.
 * - Al cambiar de paso el foco pasa al título si no hay un campo enfocado
 *   (los pasos con autoFocus ya lo resuelven solos).
 */
export default function AuthShell({ flujo, pasos, actual, paso, children }) {
  const marcoRef = useRef(null);

  useEffect(() => {
    const marco = marcoRef.current;
    if (!marco || marco.contains(document.activeElement)) return;
    marco.querySelector("h2")?.focus({ preventScroll: true });
  }, [paso]);

  return (
    <div className="auth">
      <aside className="auth-panel">
        <CircuitoDeFondo />
        <div className="auth-marca font-display">
          Activo<span>360</span>
        </div>
        <div className="auth-copy">
          <h1 className="font-display">Gestión empresarial, simplificada.</h1>
          <p>
            Centraliza personas, equipos, camiones y finanzas de CorevexSAC y
            ElectroSAC en una sola plataforma. Activo360 te permite organizar
            la información, hacer seguimiento de tus recursos y recibir alertas
            automáticas para mantener todo al día.
          </p>
        </div>
        <AuthRail key={flujo} pasos={pasos} actual={actual} />
        <div className="auth-empresas">
          <span>CorevexSAC</span>
          <span>ElectroSAC</span>
        </div>
      </aside>

      <main className="auth-main">
        <div ref={marcoRef} className="auth-marco">
          <div key={paso} className="auth-paso">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
