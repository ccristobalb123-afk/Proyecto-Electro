/**
 * Fichas desplegables por persona o camión: RRHH > Cursos / EMO y
 * Operaciones > Asignaciones. Cada fila es un bloque que se abre al tocarlo
 * y muestra sus registros adentro. Antes en styles/fichas.css (eliminado).
 *
 * Ganchos que se quedan con su nombre:
 * - persona-cursos y persona-cursos--abierta: tarjetas.css (borde suave de
 *   la ficha cerrada; abierta lleva el azul marino).
 * - persona-cursos__cabecera: styles/foco.css (anillo de foco: la regla global de
 *   foco no tiene capa y le ganaría a una clase).
 */

// Lista de fichas y lista de registros dentro de una ficha.
export const FICHAS = "m-0 flex list-none flex-col gap-2.5 p-0";
export const REGISTROS = "m-0 flex list-none flex-col gap-2 p-0";

// Cada ficha: borde de 1px (su color lo pone tarjetas.css; abierta, azul
// marino) y sombra suave. --borde-persona es el borde de adentro (flecha,
// detalle y registros).
const FICHA = `[--borde-persona:color-mix(in_srgb,var(--border-control)_45%,var(--border))] min-w-0 overflow-hidden rounded-lg border
  [background:var(--card)]`;
export const FICHA_CERRADA = `persona-cursos ${FICHA} [box-shadow:var(--shadow-sm),0_2px_6px_rgba(16,24,40,0.06)]`;
export const FICHA_ABIERTA = `persona-cursos persona-cursos--abierta ${FICHA} border-copper
  [box-shadow:inset_4px_0_0_var(--copper),var(--shadow-sm),0_4px_12px_rgba(16,24,40,0.08)]`;

// Toda la fila responde al toque (más de 44px de alto).
export const CABECERA = `persona-cursos__cabecera group flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg [border:0] [background:none] px-4 py-3.5
  text-left [font:inherit] [color:inherit]`;
export const INFO = "flex min-w-0 flex-1 flex-col gap-1";
export const NOMBRE = "font-semibold text-text wrap-anywhere";
export const RESUMEN = "flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted";
const CHIP = "rounded-[999px] px-2 py-px text-xs font-semibold";
export const CHIP_VENCIDO = `${CHIP} bg-danger-tint text-danger-dark`;
export const CHIP_POR_VENCER = `${CHIP} bg-volt-tint text-volt-dark`;

// El chevron se ve como un botón (toda la fila es el botón real); abierto,
// en azul marino y girado hacia abajo.
const FLECHA = "inline-flex size-9 flex-none items-center justify-center rounded border group-hover:border-copper group-hover:text-copper-dark";
export const FLECHA_CERRADA = `${FLECHA} border-(--borde-persona) bg-gray-tint text-text`;
export const FLECHA_ABIERTA = `${FLECHA} border-copper bg-copper-tint text-copper-dark`;
const GIRO = "[transition:transform_var(--transition-fast)]";
export const FLECHA_ICONO_CERRADA = `${GIRO} [transform:rotate(-90deg)]`;
export const FLECHA_ICONO_ABIERTA = `${GIRO} [transform:rotate(90deg)]`;

// Detalle: fondo gris muy claro con su propio borde, separado de la fila.
export const DETALLE = "mx-3 mt-0 mb-3 flex flex-col gap-3 rounded border border-(--borde-persona) bg-gray-tint p-3";

// Cada registro. Coincide con la búsqueda (RRHH): borde, halo y fondo cobre.
// Vencido (Asignaciones): borde y franja roja a la izquierda.
const REGISTRO = "flex min-w-0 flex-col gap-2 rounded border px-3 py-2.5";
export const REGISTRO_NORMAL = `${REGISTRO} border-(--borde-persona) [background:var(--card)]`;
export const REGISTRO_COINCIDE = `${REGISTRO} border-copper [background:color-mix(in_srgb,var(--copper-tint)_35%,var(--card))] [box-shadow:0_0_0_2px_var(--copper-tint)]`;
export const REGISTRO_VENCIDO = `${REGISTRO} border-danger [background:var(--card)] [box-shadow:inset_3px_0_0_var(--danger)]`;
export const REGISTRO_CABECERA = "flex flex-wrap items-start justify-between gap-x-2.5 gap-y-1.5";
export const REGISTRO_FECHAS = "m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text";
