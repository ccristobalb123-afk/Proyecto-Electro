const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Vigente/Por vencer/Vencido se calculan siempre al leer, a partir de
// la fecha de vencimiento y los días de anticipación — nunca se guardan
// en la base de datos. Si mañana cambia el día, el estado ya cambió
// solo, sin necesitar ningún cron job que los vaya recalculando.
// Renovado/Terminado sí son estados manuales — si alguien los marcó a
// propósito, ganan por encima de lo que digan las fechas.
export function calcularEstado(fechaVencimiento, diasAnticipacion, estadoManual) {
  if (estadoManual) return estadoManual.toLowerCase(); // "RENOVADO" -> "renovado"

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fechaVencimiento);
  vence.setHours(0, 0, 0, 0);

  if (vence < hoy) return "vencido";

  const msPorDia = 24 * 60 * 60 * 1000;
  const diasRestantes = Math.round((vence - hoy) / msPorDia);
  if (diasRestantes <= diasAnticipacion) return "porvencer";

  return "vigente";
}

// "28 ago 2026" — mismo formato que ya mostraba el mock, para no
// tener que tocar ningún componente del frontend al conectar esto.
export function formatearFecha(fecha) {
  const d = new Date(fecha);
  return `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export function iniciales(nombre) {
  return nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
