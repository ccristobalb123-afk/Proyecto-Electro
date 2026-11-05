/**
 * Clases de Tailwind de los formularios del acceso (Login y Restablecer
 * contraseña), compartidas para no repetirlas en cada paso.
 *
 * Márgenes de <p> y <h2>, letra de <input> y <button>, display de <label> y
 * color del enlace «Volver» van acá: base.css y etiquetas.css están en la
 * capa "base" y las clases les ganan (ver docs/tailwind.md).
 *
 * "auth-form" no da estilo por sí sola: es el gancho de AuthForm.css
 * (.btn-primary y el margen de .password-field dentro del acceso) y de
 * motion.css.
 */

export const FORM = "auth-form w-full";

// Título del paso: recibe el foco por código al cambiar de paso; no es un
// control, así que sin anillo.
export const TITULO = "m-0 mb-2 font-display text-2xl leading-[1.2] font-semibold tracking-[-0.015em] focus:outline-none";

export const SUB = "m-0 mb-7 text-[14px] leading-[1.5] text-muted";

export const CAMPO = "mb-4.5";
export const CAMPO_LABEL = "mb-1.5 block text-base font-medium text-muted";
export const CAMPO_INPUT = `h-(--control-height-lg) w-full rounded border border-control bg-card px-3.5 py-0 font-body text-[14px] text-text
  [transition:border-color_var(--transition-fast)] aria-invalid:border-danger`;

// Con movimiento reducido, solo fundido (fade-in está en motion.css).
export const ERROR = `m-0 -mt-1.5 mb-4 text-sm leading-[1.4] text-danger-dark
  animate-[auth-error-entrada_160ms_var(--ease-out)_both] motion-reduce:[animation-name:fade-in]`;

// Aviso informativo (no es un error del formulario): por qué se volvió al
// login, por ejemplo "Tu sesión se cerró por inactividad".
export const AVISO =
  "m-0 mb-4 rounded border-l-3 border-l-volt-dark bg-volt-tint px-3 py-2 text-sm leading-[1.4] text-text";

// Enlace «Volver» (<button> o <a>): 44px de alto en pantallas táctiles.
// VOLVER va arriba del paso: -ml-1 alinea el trazo del ícono con el borde
// del texto. VOLVER_ABAJO va al pie del formulario. Son dos constantes y no
// una clase que pisa a otra: con dos clases de margen en el mismo elemento,
// gana la que Tailwind ordena último, no la última escrita.
const VOLVER_BASE = `inline-flex items-center gap-0.5 p-0 text-base text-muted [background:none] [border:none]
  hover:text-text pointer-coarse:min-h-(--control-height-lg)`;
export const VOLVER = `${VOLVER_BASE} m-0 mb-5 -ml-1`;
export const VOLVER_ABAJO = `${VOLVER_BASE} m-0 mt-4`;

const ICONO = "mb-4.5 flex size-11 items-center justify-center rounded-[10px]";
export const ICONO_PASO = `${ICONO} bg-volt-tint text-volt-dark`;
export const ICONO_EXITO = `${ICONO} bg-success-tint text-success-dark`;
