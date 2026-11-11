/**
 * Aviso de inactividad ("tu sesión está por cerrarse"): AvisoInactividad.jsx.
 * Antes en AvisoInactividad.css, que queda solo con el @keyframes del pulso.
 *
 * Ganchos que se quedan con su nombre (no dan estilo por sí solos):
 * - aviso-inactividad-icono-container: motion.css (sin pulso con
 *   movimiento reducido; sin capa, le gana a la clase animate-).
 * - btn-seguir-conectado: responsive.css (44 px táctiles) y styles/foco.css
 *   (anillo de foco en --accion-dark: la regla global de foco no tiene capa
 *   y le ganaría a una clase).
 *
 * Fondo: desenfoque con backdrop-blur-[6px], que deja en el build la
 * propiedad con y sin prefijo (antes solo estaba la de Safari, ver
 * docs/tailwind.md).
 *
 * ≤400 px: max-[401px]: (Tailwind cuenta "menor que"; @media (max-width:
 * 400px) incluye los 400 px).
 */

export const FONDO = `fixed inset-0 z-(--z-critical-alert) flex items-center justify-center p-6
  [background:color-mix(in_srgb,var(--ink-2)_60%,transparent)] backdrop-blur-[6px]
  max-[401px]:p-4`;

export const TARJETA = `w-full max-w-[340px] rounded-lg border border-border p-8 text-center
  [background:var(--card)] [box-shadow:var(--shadow-lg)] max-[401px]:px-5 max-[401px]:py-6`;

// El pulso (@keyframes pulso-advertencia) sigue en AvisoInactividad.css.
// rounded-[50%] y no rounded-full: así el valor calculado es el mismo de antes.
export const ICONO_CAJA = `aviso-inactividad-icono-container mb-4 inline-flex size-14 items-center justify-center
  rounded-[50%] [background:var(--volt-tint)] animate-[pulso-advertencia_2s_infinite_ease-in-out]`;
export const ICONO = "text-volt-dark";

export const TITULO = "mx-0 mt-0 mb-2 font-display text-xl leading-[1.3] font-semibold text-text";

// También en el párrafo .sr-only (como antes, donde la regla de los
// párrafos de la tarjeta también lo alcanzaba). Su margen no: .sr-only va
// sin capa y le gana a mb-6; da igual, está fuera del flujo y oculto.
export const TEXTO = "mx-0 mt-0 mb-6 text-[14px] leading-[1.5] text-muted";

export const TIEMPO = "rounded-[4px] [background:var(--volt-tint)] px-1.5 py-0.5 font-mono text-md font-semibold text-volt-dark";

export const BOTON = `btn-seguir-conectado w-full cursor-pointer rounded [border:none] [background:var(--accion)] px-5 py-[11px]
  text-[14px] font-semibold text-on-accent [transition:background_0.15s_ease]
  hover:not-disabled:[background:var(--accion-dark)] disabled:cursor-progress disabled:opacity-75`;
