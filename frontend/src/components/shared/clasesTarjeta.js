/**
 * Tarjetas de lista con encabezado, cuerpo y pie (Administración, Finanzas
 * y las de celular de RRHH; las de Equipos usan solo el rótulo y la
 * etiqueta de estado, porque su borde es otro: --borde-tarjeta). Cada pantalla les suma su clase gancho:
 * usuario-card / fin-card / rrhh-mobile-card (tarjetas.css pone el borde
 * suave), usuarios-grid / fin-grid y
 * usuario-card-footer / fin-card-footer (responsive.css: una columna y las
 * acciones en cuadrícula en celular).
 */

export const GRILLA_TARJETAS = "grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4";

export const TARJETA = "flex flex-col rounded-lg border border-border [background:var(--card)] [box-shadow:var(--shadow-sm)]";

// Encabezado: avatar o título a la izquierda, marca, estado o monto a la derecha.
export const CABECERA_TARJETA = "flex items-start gap-2.5 px-4 pt-4 pb-3.5";

// Rótulo de un dato ("Acceso a", "Monto total"). ETIQUETA_FORMA va sin color
// para los rótulos que van sobre un fondo de color (Equipos: "Asignado a").
export const ETIQUETA_FORMA = "block text-xs font-semibold uppercase tracking-[0.05em]";
export const ETIQUETA_TARJETA = `${ETIQUETA_FORMA} text-muted-2`;

// Pie con las acciones.
export const PIE_TARJETA = "mt-auto flex flex-wrap items-center gap-1.5 border-t border-t-border bg-paper px-4 py-3";

// Etiqueta de estado con punto de color (RRHH, Equipos). Cada pantalla le
// suma el fondo y el color de cada estado.
export const ESTADO_BASE = "inline-flex items-center gap-[5px] rounded-[12px] px-2.5 py-1 text-xs font-semibold";
export const ESTADO_PUNTO = "inline-block size-1.5 rounded-[50%] bg-current";

// Avatar redondo con iniciales o ícono. Cada pantalla le pone su tamaño:
// 30px en RRHH, 26px en Asignaciones.
export const AVATAR_FORMA = "flex flex-none items-center justify-center rounded-[50%] border border-border bg-paper text-xs font-semibold text-muted";
