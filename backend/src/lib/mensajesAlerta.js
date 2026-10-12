// ============================================================
// Avisos de vencimiento — reglas y textos en UN solo lugar.
//
// El push, la campana y el Dashboard usan estas mismas funciones, así
// que los tres dicen siempre exactamente lo mismo. Los días se calculan
// con diasHasta (lib/estadoVencimiento.js), la función compartida que
// ya corrige el desfase de un día; acá no se recalcula nada.
// ============================================================
import { diasHasta } from "./estadoVencimiento.js";

/**
 * Días DESPUÉS del vencimiento en que se sigue mandando PUSH (1, 2 y 3).
 * La campana y el Dashboard no tienen este límite: muestran lo vencido
 * hasta que se renueve (se cambie la fecha de vencimiento).
 */
export const DIAS_AVISO_DESPUES_DE_VENCER = 3;

/** Las facturas no guardan días de anticipación propios: se avisa desde estos días antes. */
export const DIAS_AVISO_FACTURA = 30;

/** Con más de esta cantidad de avisos el mismo día, se agrupan en un solo push. */
export const MAX_PUSH_INDIVIDUALES = 2;

/**
 * Fase del aviso según los días que faltan (negativo = ya venció):
 *   "porvencer" → dentro de los días de anticipación
 *   "hoy"       → vence hoy
 *   "vencido"   → venció hace 1..DIAS_AVISO_DESPUES_DE_VENCER días
 *   null        → no corresponde avisar
 */
export function faseAviso(dias, diasAnticipacion) {
  if (dias === 0) return "hoy";
  if (dias > 0) return dias <= diasAnticipacion ? "porvencer" : null;
  return -dias <= DIAS_AVISO_DESPUES_DE_VENCER ? "vencido" : null;
}

/** "22/10/2026" a partir de una columna DATE (partes UTC, sin desfase). */
export function fechaDdMmAaaa(fecha) {
  const d = new Date(fecha);
  return [d.getUTCDate(), d.getUTCMonth() + 1].map((n) => String(n).padStart(2, "0")).join("/") + "/" + d.getUTCFullYear();
}

const dias = (n) => `${n} ${n === 1 ? "día" : "días"}`;

/**
 * Crea un aviso (solo datos; el texto lo arma construirMensaje).
 * @param {object} p
 * @param {string} p.tipo        contrato | curso | vehiculo | equipo | factura
 * @param {number} p.entidadId   id del registro
 * @param {string} p.claveDedupe clave diaria en AlertaNotificada (ej. "documento_vehiculo")
 * @param {string} p.que         nombre legible para el título ("SOAT", "Contrato", "EMO"…)
 * @param {"m"|"f"} p.genero     concordancia: "SOAT vencido" / "Inspección vencida"
 * @param {boolean} [p.plural]   "Lunas Polarizadas vencen hoy"
 * @param {string} p.sujeto      inicio del cuerpo ("El SOAT del vehículo ABC-123")
 * @param {Date} p.fecha         fecha de vencimiento (columna DATE)
 * @param {number} p.diasAnticipacion
 * @param {string} p.empresa     nombre de la empresa ("CorevexSAC")
 * @param {string[]} p.empresas  slugs con acceso (para filtrar y para el push)
 * @param {string} p.modulo      módulo necesario para verlo (rrhh | operaciones | finanzas)
 * @param {string} p.url         a dónde lleva al tocarlo
 * @param {boolean} [p.vencidoSinLimite] true para la campana y el Dashboard: lo
 *   vencido se muestra siempre, no solo los primeros días (el push sí tiene límite)
 * @returns {object|null} null si hoy no corresponde avisar
 */
export function crearAviso(p) {
  const d = diasHasta(p.fecha);
  const severidad = d < 0 && p.vencidoSinLimite ? "vencido" : faseAviso(d, p.diasAnticipacion);
  if (!severidad) return null;
  return { ...p, id: `${p.tipo}-${p.entidadId}`, dias: d, severidad };
}

/**
 * EL constructor de mensajes. Devuelve lo que se muestra en el push,
 * la campana y el Dashboard.
 * @param {object} aviso   resultado de crearAviso
 * @param {object} [opciones]
 * @param {boolean} [opciones.incluirEmpresa] true si quien lo lee tiene acceso a más de una empresa
 */
export function construirMensaje(aviso, { incluirEmpresa = false } = {}) {
  const { que, genero, plural, sujeto, empresa, fecha, severidad } = aviso;
  const n = Math.abs(aviso.dias);
  const vence = plural ? "vencen" : "vence";
  const vencio = plural ? "vencieron" : "venció";
  const vencidoAdj = (genero === "f" ? "vencida" : "vencido") + (plural ? "s" : "");

  const titulo =
    severidad === "porvencer" ? `${que} por vencer` : severidad === "hoy" ? `${que} ${vence} hoy` : `${que} ${vencidoAdj}`;

  const cuando =
    severidad === "porvencer" ? `${vence} en ${dias(n)}` : severidad === "hoy" ? `${vence} hoy` : `${vencio} hace ${dias(n)}`;

  const deEmpresa = incluirEmpresa && empresa ? ` (${empresa})` : "";
  const cuerpo = `${sujeto}${deEmpresa} ${cuando} (${fechaDdMmAaaa(fecha)}).`;

  return {
    id: aviso.id,
    tipo: aviso.tipo,
    severidad, // porvencer | hoy | vencido
    titulo,
    cuerpo,
    url: aviso.url,
    dias: aviso.dias,
    fecha: fechaDdMmAaaa(fecha),
    empresa,
  };
}

/**
 * Orden por urgencia: vencidos primero (el más antiguo arriba), después
 * los que vencen hoy y al final los por vencer, del más cercano al más
 * lejano. Como `dias` ya es negativo para los vencidos, alcanza con
 * ordenar por `dias` de menor a mayor.
 */
export function porUrgencia(a, b) {
  return a.dias - b.dias;
}

/** Push agrupado: "Tienes 6 documentos por atender". */
export function construirResumen(avisos) {
  const cuenta = { vencido: 0, hoy: 0, porvencer: 0 };
  for (const a of avisos) cuenta[a.severidad]++;
  const partes = [
    cuenta.vencido && `${cuenta.vencido} ${cuenta.vencido === 1 ? "vencido" : "vencidos"}`,
    cuenta.hoy && `${cuenta.hoy} ${cuenta.hoy === 1 ? "vence" : "vencen"} hoy`,
    cuenta.porvencer && `${cuenta.porvencer} por vencer`,
  ].filter(Boolean);
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0];
  const modulos = new Set(avisos.map((a) => a.url.split("?")[0]));
  return {
    titulo: `Tienes ${avisos.length} documentos por atender`,
    cuerpo: `${lista[0].toUpperCase()}${lista.slice(1)}. Toca para ver el detalle.`,
    // Todos del mismo módulo → a ese módulo; si no, al Dashboard.
    url: modulos.size === 1 ? [...modulos][0] : "/dashboard",
  };
}
