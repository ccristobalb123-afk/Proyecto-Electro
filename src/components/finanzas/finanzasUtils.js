export function soles(n) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
}

export function formatFecha(iso) {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export const ESTADO_PAGO_LABEL = { pendiente: "Pendiente", parcial: "Pago parcial", pagado: "Pagado" };
