/**
 * Clases de Tailwind de los formularios del acceso (Login y Restablecer
 * contraseña), compartidas para no repetirlas en cada paso.
 *
 * Las clases "auth-…" que quedan junto a las de Tailwind no dan estilo por
 * sí solas: son el gancho de AuthForm.css, donde siguen las propiedades que
 * base.css fija en ese mismo elemento (márgenes de <p> y <h2>, letra de
 * <input> y <button>…). Esas reglas no están en capa y le ganarían a la
 * clase de Tailwind; ver docs/tailwind.md.
 */

export const FORM = "auth-form w-full";

// Título del paso: recibe el foco por código al cambiar de paso; no es un
// control, así que sin anillo.
export const TITULO = "font-display tracking-[-0.015em] focus:outline-none";

export const SUB = "auth-sub text-[14px] leading-[1.5] text-muted";

export const CAMPO = "auth-field mb-4.5";
export const CAMPO_LABEL = "mb-1.5 text-base font-medium text-muted";
export const CAMPO_INPUT = `h-(--control-height-lg) w-full rounded border border-control bg-card px-3.5 py-0 text-text
  [transition:border-color_var(--transition-fast)] aria-invalid:border-danger`;

// Con movimiento reducido, solo fundido (fade-in está en motion.css).
export const ERROR = `auth-error text-sm leading-[1.4] text-danger-dark
  animate-[auth-error-entrada_160ms_var(--ease-out)_both] motion-reduce:[animation-name:fade-in]`;

// Aviso informativo (no es un error del formulario): por qué se volvió al
// login, por ejemplo "Tu sesión se cerró por inactividad".
export const AVISO =
  "auth-aviso rounded border-l-3 border-l-volt-dark bg-volt-tint px-3 py-2 text-sm leading-[1.4] text-text";

// Enlace «Volver»: 44px de alto en pantallas táctiles.
export const VOLVER = `auth-back inline-flex items-center gap-0.5 p-0 [background:none] [border:none]
  pointer-coarse:min-h-(--control-height-lg)`;

const ICONO = "mb-4.5 flex size-11 items-center justify-center rounded-[10px]";
export const ICONO_PASO = `${ICONO} bg-volt-tint text-volt-dark`;
export const ICONO_EXITO = `${ICONO} bg-success-tint text-success-dark`;
