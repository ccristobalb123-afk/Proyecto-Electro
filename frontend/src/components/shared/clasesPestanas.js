/**
 * Pestañas de pantalla (Finanzas; RRHH y Operaciones todavía las tienen en
 * su CSS, con los mismos valores). Ganchos que se quedan:
 * - tabs: responsive.css (en celular ocupan todo el ancho y se desplazan).
 * - active: Rrhh.css y Operaciones.css definen .tabs button y
 *   .tabs button.active sin capa; si se entra a Finanzas después de abrir
 *   una de esas pantallas, esas reglas siguen cargadas y sin "active" la
 *   pestaña elegida se vería como las demás.
 */

export const PESTANAS = "tabs mb-5 flex w-fit gap-1 rounded border border-border [background:var(--card)] p-[3px]";

export const PESTANA = "rounded-[6px] [border:none] px-[18px] py-2 text-[13.5px] font-medium";
export const PESTANA_NORMAL = "[background:none] text-muted";
export const PESTANA_ACTIVA = "active [background:var(--copper-tint)] text-copper-dark";
