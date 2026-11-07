/**
 * Clases de Tailwind de RRHH (tabla y tarjetas de Contratos, fichas de
 * Cursos / EMO y detalle). La base de la tarjeta y el rótulo de cada dato
 * son los compartidos (shared/clasesTarjeta.js).
 *
 * Ganchos que se quedan con su nombre:
 * - table-scroll y rrhh-cards-mobile: responsive.css (hasta 800px la tabla
 *   se oculta y se muestran las tarjetas).
 * - rrhh-mobile-card: tarjetas.css (borde suave).
 */
import { AVATAR_FORMA, ESTADO_BASE, ESTADO_PUNTO, ETIQUETA_TARJETA, TARJETA as TARJETA_BASE } from "../shared/clasesTarjeta";

// Trabajador: avatar con iniciales y nombre. En la tarjeta de celular el
// nombre se parte donde haga falta.
export const TRABAJADOR = "flex items-center gap-2.5";
export const TRABAJADOR_TARJETA = `${TRABAJADOR} min-w-0`;
export const TRABAJADOR_NOMBRE_TARJETA = "font-semibold wrap-anywhere";
export const AVATAR = `size-[30px] ${AVATAR_FORMA}`;

// Estado de un contrato, curso o EMO, con su punto de color (base compartida).
const ESTADO = ESTADO_BASE;
export const ESTADO_RRHH = {
  vigente: `${ESTADO} bg-success-tint text-success-dark`,
  porvencer: `${ESTADO} bg-volt-tint text-volt-dark`,
  vencido: `${ESTADO} bg-danger-tint text-danger-dark`,
  renovado: `${ESTADO} bg-electro-tint text-electro-dark`,
  terminado: `${ESTADO} bg-gray-tint text-gray-dark`,
};
export { ESTADO_PUNTO };

// Tabla de Contratos (escritorio).
export const TABLA = "w-full border-collapse overflow-hidden rounded-lg border border-border [background:var(--card)]";
export const TH = "border-b border-b-border [background:var(--paper)] px-[18px] py-3 text-left text-xs font-semibold uppercase tracking-[0.03em] text-muted";
export const FILA = "[&:last-child>td]:[border-bottom:none] hover:bg-gray-tint";
const TD = "border-b border-b-border px-[18px] py-3.5";
export const CELDA = `${TD} text-[13.5px]`;
export const CELDA_CODIGO = `${TD} [font-family:var(--font-mono)] text-[12.5px] text-muted`;
export const TABLA_ACCIONES = "flex items-center gap-2 whitespace-nowrap";

// Tarjetas de Contratos (hasta 800px). Ocultas por defecto: responsive.css
// las muestra (display: grid) y esconde la tabla.
export const TARJETAS = "rrhh-cards-mobile hidden flex-col gap-2.5";
export const TARJETA = `rrhh-mobile-card ${TARJETA_BASE} gap-2.5 px-4 py-3.5`;
export const TARJETA_ARRIBA = "flex items-center justify-between gap-2.5";
export const TARJETA_ACCIONES = "flex shrink-0 items-center gap-2";
export const TARJETA_ETIQUETAS = "flex flex-wrap gap-2";
export const TARJETA_DATOS = "grid grid-cols-[1fr_1fr] gap-2.5 border-t border-t-border pt-2.5";
export const TARJETA_VALOR = "mx-0 mt-1 mb-0 text-[13px] font-semibold text-text";
export const TARJETA_DOCUMENTO = "flex flex-wrap items-center justify-between gap-2 border-t border-t-border pt-2.5";
export const ETIQUETA = ETIQUETA_TARJETA;

// Documento: "Sin adjuntar" / "Sin documento" y la celda de Cursos / EMO.
export const SIN_ADJUNTAR = "text-[12px] text-muted-2";
export const DOC_CELDA = "inline-flex flex-wrap items-center gap-x-2.5 gap-y-1.5";

// Avisos en amarillo (faltan datos / sin contrato) y en verde (curso guardado).
const AVISO = "mx-0 mt-0 mb-3 rounded px-3 py-2 text-sm leading-[1.4]";
export const AVISO_FALTAN = `${AVISO} bg-volt-tint text-volt-dark`;
export const AVISO_GUARDADO = `${AVISO} bg-success-tint text-success-dark`;
