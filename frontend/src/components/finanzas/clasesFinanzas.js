/**
 * Clases de Tailwind de las tarjetas de Finanzas (facturas, facturas por
 * pagar y gastos) y del rótulo que también usa el modal de registrar pago.
 * La base de la tarjeta es la compartida (shared/clasesTarjeta.js).
 *
 * Ganchos que se quedan con su nombre: fin-grid, fin-card-footer,
 * fin-card-header, fin-card-archivo y fin-card-archivo--link (responsive.css)
 * y fin-card (tarjetas.css: el borde suave de la tarjeta sigue ahí).
 */
import { CABECERA_TARJETA, ETIQUETA_TARJETA, GRILLA_TARJETAS, PIE_TARJETA, TARJETA as TARJETA_BASE } from "../shared/clasesTarjeta";

export const GRILLA = `fin-grid ${GRILLA_TARJETAS}`;
export const TARJETA = `fin-card ${TARJETA_BASE}`;

// En celular, responsive.css deja bajar el monto o el estado a su propia
// línea si el título no tiene al menos 180px (.fin-card-header).
export const CABECERA = `fin-card-header ${CABECERA_TARJETA} justify-between`;
export const CABECERA_TEXTO = "min-w-0";
export const TITULO = "wrap-anywhere text-[14.5px] font-bold text-text";
export const SUBTITULO = "mt-[3px] flex flex-wrap items-center gap-1.5 text-[12px] text-muted";

// Un monto nunca se parte en dos líneas ("S/" arriba, número abajo).
// [font-family:…]: se escribió así cuando .font-mono iba sin capa en tokens.css;
// hoy font-mono es la utilidad de Tailwind y daría lo mismo.
const MONTO_BASE = "whitespace-nowrap [font-family:var(--font-mono)] text-[15px] font-bold";
export const MONTO = `${MONTO_BASE} text-text`;
export const MONTO_SALDO = `${MONTO_BASE} text-danger-dark`;

export const CUERPO = "flex flex-1 flex-col gap-3 px-4 pb-3.5";
export const ETIQUETA = `${ETIQUETA_TARJETA} mb-0.5`;

// Monto total y saldo lado a lado si entran; si no (montos de 8 cifras en un
// celular de 360px), uno debajo del otro.
export const MONTOS = "grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-3.5 gap-y-2.5 border-t border-t-border pt-3";
export const FECHAS = "grid grid-cols-[repeat(2,1fr)] gap-x-3.5 gap-y-2.5 text-[12.5px] text-text";
export const FECHA = "flex flex-col";

// Con descripciones largas ocupa 2 líneas: una píldora de 999px se veía deformada.
export const DETRACCION = "self-start rounded-[10px] bg-volt-tint px-[9px] py-[3px] text-xs font-semibold text-volt-dark";

export const PIE = `fin-card-footer ${PIE_TARJETA}`;

// Estado de pago (y "Anulada").
const ESTADO = "whitespace-nowrap rounded-[12px] px-2.5 py-1 text-xs font-semibold";
export const ESTADO_PAGO = {
  pendiente: `${ESTADO} bg-danger-tint text-danger-dark`,
  parcial: `${ESTADO} bg-volt-tint text-volt-dark`,
  pagado: `${ESTADO} bg-success-tint text-success-dark`,
  anulada: `${ESTADO} bg-gray-tint text-gray-dark line-through`,
};

// Comprobante: "Adjuntar comprobante" (label), "Subiendo…" (span) o "Ver
// comprobante" (BotonVerArchivo). Letra y color van con [&&]: para ganarle a
// las clases del botón ([font:inherit], [color:inherit]).
const ARCHIVO = "fin-card-archivo inline-flex w-fit items-center gap-1.5 [&&]:text-[12px] [&&]:font-semibold";
export const ARCHIVO_ADJUNTAR = `${ARCHIVO} cursor-pointer [&&]:text-muted`;
export const ARCHIVO_SUBIENDO = `${ARCHIVO} cursor-progress [&&]:text-muted tabular-nums`;
// En celular, responsive.css pasa el subrayado a continuo (.fin-card-archivo--link).
export const ARCHIVO_VER = `${ARCHIVO} fin-card-archivo--link cursor-pointer [&&]:text-link underline decoration-dotted underline-offset-3
  [&&]:hover:text-link-hover`;

// Gastos: tipo de comprobante, "Faltan datos", RUC y "Sin documento".
export const COMPROBANTE = "flex flex-wrap items-center gap-1.5";
const TIPO = "rounded-[6px] border border-current px-[9px] py-0.5 text-xs font-bold uppercase tracking-[0.05em]";
export const TIPO_COMPROBANTE = {
  boleta: `${TIPO} bg-gray-tint text-gray-dark`,
  factura: `${TIPO} bg-copper-tint text-copper-dark`,
  sin: `${TIPO} border-dashed text-muted`,
};
export const FALTAN = "rounded-[999px] bg-volt-tint px-[9px] py-0.5 text-xs font-semibold text-volt-dark";
export const RUC = "[font-family:var(--font-mono)] tabular-nums";
export const SIN_DOCUMENTO = "text-[12px] font-semibold text-muted";
