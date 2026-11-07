/**
 * Tarjetas de lista con encabezado, cuerpo y pie (Administración, Finanzas
 * y las de celular de RRHH). Cada pantalla les suma su clase gancho:
 * usuario-card / fin-card / rrhh-mobile-card (tarjetas.css pone el borde
 * suave), usuarios-grid / fin-grid y
 * usuario-card-footer / fin-card-footer (responsive.css: una columna y las
 * acciones en cuadrícula en celular).
 */

export const GRILLA_TARJETAS = "grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4";

export const TARJETA = "flex flex-col rounded-lg border border-border [background:var(--card)] [box-shadow:var(--shadow-sm)]";

// Encabezado: avatar o título a la izquierda, marca, estado o monto a la derecha.
export const CABECERA_TARJETA = "flex items-start gap-2.5 px-4 pt-4 pb-3.5";

// Rótulo de un dato ("Acceso a", "Monto total").
export const ETIQUETA_TARJETA = "block text-xs font-semibold uppercase tracking-[0.05em] text-muted-2";

// Pie con las acciones.
export const PIE_TARJETA = "mt-auto flex flex-wrap items-center gap-1.5 border-t border-t-border bg-paper px-4 py-3";
