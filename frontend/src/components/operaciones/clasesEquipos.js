/**
 * Clases de Tailwind de la pestaña Equipos (grupos por tipo y tarjetas) y del
 * aviso "Faltan datos", que también usa el modal de editar equipo. El rótulo
 * y la etiqueta de estado son los compartidos (shared/clasesTarjeta.js).
 *
 * La tarjeta lleva el borde de equipos y vehículos (--borde-tarjeta, en
 * tokens.css: --borde-tarjeta-ancho y --borde-tarjeta-color); el relleno
 * lateral descuenta lo que ese borde crece (--borde-tarjeta-extra).
 *
 * Ganchos que se quedan con su nombre:
 * - categoria-seccion-header, equipo-card-actions, equipo-card-fotos-editar y
 *   equipo-card-select: responsive.css (título más chico, acciones en
 *   cuadrícula y 44px táctiles en celular).
 * - equipo-card-foto-btn: motion.css (sin zoom con movimiento reducido).
 * - equipo-faltantes y equipo-vencido: EquiposCards.css (margen superior del
 *   botón de adentro, ver ahí).
 */
import { ESTADO_BASE, ESTADO_PUNTO, ETIQUETA_FORMA } from "../shared/clasesTarjeta";

export { ESTADO_PUNTO };

export const GRUPOS = "flex flex-col gap-7";
export const GRUPO_CABECERA = "categoria-seccion-header mb-3.5 flex items-center gap-2.5";
export const GRUPO_TITULO = "m-0 text-[16px] font-semibold text-text";
export const GRUPO_CONTADOR = "flex h-[22px] min-w-[22px] items-center justify-center rounded-[999px] border border-border bg-paper px-[7px] text-[12px] font-semibold text-muted";
// 1 columna; 2 desde 576px; 3 desde 992px. minmax(0, 1fr) evita que un texto
// largo ensanche la columna.
export const GRILLA = "grid grid-cols-[minmax(0,1fr)] gap-4 min-[576px]:grid-cols-2 min-[992px]:grid-cols-3";

const LATERAL = "px-[calc(16px-var(--borde-tarjeta-extra))]";
// overflow: hidden deja el pie gris dentro de las esquinas redondeadas.
export const TARJETA = "flex flex-col overflow-hidden rounded-lg [border:var(--borde-tarjeta)] [background:var(--card)] [box-shadow:var(--shadow-sm)]";
export const CABECERA = `flex items-start justify-between gap-2.5 pt-4 pb-3.5 ${LATERAL}`;
// Seriales y códigos largos no empujan la etiqueta de estado.
export const CODIGO = "[font-family:var(--font-mono)] text-[14px] font-bold text-text wrap-anywhere";
export const CODIGO_TIPO = "[font-family:var(--font-body)] text-xs font-semibold text-muted";
export const TIPO = "mt-0.5 text-[12px] text-muted";
export const CUERPO = `flex flex-1 flex-col gap-3 pb-3.5 ${LATERAL}`;

const ESTADO_COLOR = {
  disponible: "bg-success-tint text-success-dark",
  asignado: "bg-electro-tint text-electro-dark",
  mantenimiento: "bg-volt-tint text-volt-dark",
  vencido: "bg-danger-tint text-danger-dark",
  debaja: "bg-gray-tint text-gray-dark",
};
export const ESTADO_EQUIPO = Object.fromEntries(Object.entries(ESTADO_COLOR).map(([estado, color]) => [estado, `${ESTADO_BASE} ${color}`]));

// Rótulo: gris; sobre "Asignado a" (azul) o "Qué tiene" (ámbar), del color del recuadro.
const ETIQUETA_BASE = `${ETIQUETA_FORMA} mb-0.5`;
export const ETIQUETA = `${ETIQUETA_BASE} text-muted-2`;
export const ETIQUETA_ASIGNADO = `${ETIQUETA_BASE} text-electro-dark opacity-75`;
export const ETIQUETA_ADVERTENCIA = `${ETIQUETA_BASE} text-volt-dark opacity-75`;

// Fotos: dos casillas (o las fotos) y el botón de editar encima.
export const FOTOS_CAJA = "relative";
export const FOTOS = "flex gap-2";
export const FOTO_VACIA = "aspect-[4/3] flex-1 rounded border-[1.5px] border-dashed border-border bg-paper";
export const FOTOS_EDITAR = `equipo-card-fotos-editar absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-[50%] [border:none]
  [background:rgba(15,19,24,0.55)] text-on-accent hover:[background:rgba(15,19,24,0.75)]`;
export const FOTO_BOTON = "equipo-card-foto-btn group aspect-[4/3] flex-1 overflow-hidden rounded border border-border [background:none] p-0";
export const FOTO_IMAGEN = "block size-full object-cover [transition:transform_0.15s_ease] group-hover:[transform:scale(1.04)]";

// "Asignado a" (azul) y "Qué tiene" (mantenimiento, ámbar).
const RECUADRO = "rounded px-2.5 py-2";
export const ASIGNADO = `${RECUADRO} bg-electro-tint`;
export const ADVERTENCIA = `${RECUADRO} bg-volt-tint`;
const VALOR = "text-[13px] font-semibold";
export const ASIGNADO_VALOR = `${VALOR} flex items-center gap-1.5 text-electro-dark wrap-anywhere`;
export const ADVERTENCIA_VALOR = `${VALOR} text-volt-dark wrap-anywhere whitespace-pre-line`;
// "En mantenimiento desde el 11 nov 2026 (5 días)", debajo del comentario.
export const ADVERTENCIA_DETALLE = "mt-1 block text-[12px] text-volt-dark";

// Datos del tipo y fechas de inspección, en 2 columnas.
const DOS_COLUMNAS = "grid grid-cols-[repeat(2,1fr)] gap-x-3.5 gap-y-2.5 border-t border-t-border pt-3";
export const CAMPOS = DOS_COLUMNAS;
export const CAMPO = "flex flex-col";
export const CAMPO_VALOR = "text-[13.5px] font-semibold text-text wrap-anywhere";
export const INSPECCIONES = `${DOS_COLUMNAS} text-[12.5px] text-text`;

// Avisos: faltan datos (ámbar) y vencido (rojo).
const AVISO = "mx-0 mt-0 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded px-3 py-2 text-sm leading-[1.4]";
export const AVISO_FALTAN = `equipo-faltantes ${AVISO} bg-volt-tint text-volt-dark`;
export const AVISO_VENCIDO = `equipo-vencido ${AVISO} bg-danger-tint text-danger-dark`;
// "Completar datos" / "Renovar fechas" (.link-button) con la letra y el color
// del aviso.
export const AVISO_FALTAN_BOTON = "link-button text-sm font-semibold text-volt-dark";
export const AVISO_VENCIDO_BOTON = "link-button text-sm font-semibold text-danger-dark";

// Pie: "Actualizando…", acciones y "Cambiar estado".
export const PIE = `mt-auto flex flex-col gap-2.5 border-t border-t-border bg-paper py-3 ${LATERAL}`;
export const ACTUALIZANDO = "flex items-center gap-2 text-xs font-semibold text-muted";
export const ACCIONES = "equipo-card-actions flex flex-wrap items-center gap-x-1.5 gap-y-2";
export const CAMBIAR_ESTADO = "equipo-card-select flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.03em] text-muted";
export const CAMBIAR_ESTADO_SELECT = `max-w-[62%] flex-1 rounded-[7px] border border-control [background:var(--card)] px-2 py-1.5 [font-family:var(--font-body)]
  text-[12.5px] font-medium normal-case [letter-spacing:normal] text-text`;
