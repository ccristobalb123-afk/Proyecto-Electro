import { useEffect, useRef } from "react";
import AuthRail from "./AuthRail";
import "./AuthShell.css";
import "./AuthForm.css";

// Estilos con Tailwind (ver docs/tailwind.md). AuthShell.css solo tiene las
// animaciones de entrada (@keyframes); AuthForm.css, el margen del campo de
// contraseña compartido dentro del acceso y el @keyframes del error.
//
// El cambio de diseño de este acceso es en 960px (no en lg: = 961px):
// max-[960px]: = hasta 959px, igual que el "@media (max-width: 959px)" de
// antes. "[@media(min-width:960px)_and_(max-height:620px)]:" = ventana de
// escritorio poco alta: el texto del panel no cabría, se recortan solo los
// márgenes verticales. Va escrita entera: Tailwind no ve clases armadas
// con ${...}.

// Dibujo decorativo del panel: estático y muy tenue, para que el riel sea lo
// único brillante. Antes vivía en Login.jsx con el color escrito a mano.
function CircuitoDeFondo() {
  return (
    <svg
      className="absolute inset-0 h-full w-full text-volt opacity-12 animate-[auth-fondo-entrada_700ms_ease-out_both]"
      viewBox="0 0 500 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
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

const EMPRESA = "rounded-[20px] border border-ink-border px-3 py-1";

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
    // min-h-screen es el respaldo (100vh) para navegadores sin dvh.
    <div className="flex min-h-screen w-full supports-[min-height:100dvh]:min-h-dvh max-[960px]:flex-col">
      <aside
        className={`relative flex flex-[0_0_40%] flex-col overflow-hidden bg-ink p-12 text-on-ink [@media(min-width:960px)_and_(max-height:620px)]:py-8
          max-[960px]:flex-none max-[960px]:gap-5
          max-[960px]:pt-[max(var(--space-5),env(safe-area-inset-top))]
          max-[960px]:pr-[max(var(--space-5),env(safe-area-inset-right))]
          max-[960px]:pb-5
          max-[960px]:pl-[max(var(--space-5),env(safe-area-inset-left))]`}
      >
        <CircuitoDeFondo />
        {/* "relative" en cada hijo: quedan por encima del dibujo de fondo.
            La marca (44px) es mayor que el título (34px): lidera el panel. */}
        <div className="font-display relative text-[44px] leading-none font-bold tracking-[-0.03em] max-[960px]:text-[32px]">
          Activo<span className="text-volt">360</span>
        </div>
        {/* mt-auto empuja el bloque copy + riel + empresas hacia abajo */}
        <div className="relative mt-auto max-w-[360px] max-[960px]:hidden">
          <h1 className="m-0 mb-3.5 font-display text-[34px] leading-[1.15] font-semibold tracking-[-0.02em] text-balance">
            Gestión empresarial, simplificada.
          </h1>
          <p className="m-0 text-md leading-[1.6] text-on-ink-soft">
            Centraliza personas, equipos, camiones y finanzas de CorevexSAC y
            ElectroSAC en una sola plataforma. Activo360 te permite organizar
            la información, hacer seguimiento de tus recursos y recibir alertas
            automáticas para mantener todo al día.
          </p>
        </div>
        <AuthRail key={flujo} pasos={pasos} actual={actual} />
        <div className="relative mt-12 flex gap-4 text-sm text-on-ink-muted max-[960px]:hidden [@media(min-width:960px)_and_(max-height:620px)]:mt-6">
          <span className={EMPRESA}>CorevexSAC</span>
          <span className={EMPRESA}>ElectroSAC</span>
        </div>
      </aside>

      {/* El formulario se ancla arriba (no se centra en vertical): entre
          pasos de distinta altura lo de arriba se queda quieto. */}
      <main
        className={`flex min-w-0 flex-1 items-start justify-center bg-card
          px-10 pt-[clamp(var(--space-10),18vh,160px)] pb-10
          max-[960px]:pt-8
          max-[960px]:pr-[max(var(--space-5),env(safe-area-inset-right))]
          max-[960px]:pb-[max(var(--space-8),env(safe-area-inset-bottom))]
          max-[960px]:pl-[max(var(--space-5),env(safe-area-inset-left))]`}
      >
        <div ref={marcoRef} className="w-full max-w-[360px] max-[960px]:mx-auto max-[960px]:max-w-[440px]">
          {/* Con movimiento reducido, solo fundido (fade-in está en motion.css) */}
          <div
            key={paso}
            className="animate-[auth-paso-entrada_220ms_var(--ease-out)_both] motion-reduce:[animation-name:fade-in]"
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
