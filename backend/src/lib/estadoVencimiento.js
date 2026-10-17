// "EMO" va en mayúsculas (es una sigla). FOTOCHECK ya no se puede
// crear, pero se sigue mostrando bien en registros anteriores.
export const TIPO_CURSO_A_TEXTO = { CURSO: "Curso", FOTOCHECK: "Fotocheck", EMO: "EMO" };

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Vigente/Por vencer/Vencido se calculan siempre al leer, a partir de
// la fecha de vencimiento y los días de anticipación — nunca se guardan
// en la base de datos. Si mañana cambia el día, el estado ya cambió
// solo, sin necesitar ningún cron job que los vaya recalculando.
// Renovado/Terminado sí son estados manuales — si alguien los marcó a
// propósito, ganan por encima de lo que digan las fechas.
// ---- Fechas de calendario (columnas @db.Date) ----
// Postgres devuelve una columna DATE como medianoche UTC. Leída con la
// hora local del servidor (Perú, UTC−5) cae en el día ANTERIOR: antes
// "vence en 10 días" salía como 9, y "Vence 22 oct" como 21 oct. Para
// estas columnas se usan siempre sus partes UTC, y "hoy" es la fecha
// local de calendario.
const MS_POR_DIA = 24 * 60 * 60 * 1000;

function utcDeFechaDia(fecha) {
  const f = new Date(fecha);
  return Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate());
}

function utcDeHoy() {
  const h = new Date();
  return Date.UTC(h.getFullYear(), h.getMonth(), h.getDate());
}

/** Días de calendario desde hoy hasta una fecha DATE (negativo = ya pasó). */
export function diasHasta(fecha) {
  return Math.round((utcDeFechaDia(fecha) - utcDeHoy()) / MS_POR_DIA);
}

/** Vencido = su fecha ya pasó (el mismo día del vencimiento todavía vale). */
export function vencidoPorFecha(fecha) {
  return !!fecha && diasHasta(fecha) < 0;
}

export function calcularEstado(fechaVencimiento, diasAnticipacion, estadoManual) {
  if (estadoManual) return estadoManual.toLowerCase(); // "RENOVADO" -> "renovado"

  const dias = diasHasta(fechaVencimiento);
  if (vencidoPorFecha(fechaVencimiento)) return "vencido";
  if (dias <= diasAnticipacion) return "porvencer";
  return "vigente";
}

// "28 ago 2026" — mismo formato que ya mostraba el mock, para no
// tener que tocar ningún componente del frontend al conectar esto.
// Para MARCAS DE TIEMPO (creadoEn del historial): usa la hora local.
export function formatearFecha(fecha) {
  const d = new Date(fecha);
  return `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

// Para columnas DATE (vencimientos, inspecciones): sus partes UTC —
// ver la nota de diasHasta.
export function formatearFechaDia(fecha) {
  const d = new Date(fecha);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function iniciales(nombre) {
  return nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
