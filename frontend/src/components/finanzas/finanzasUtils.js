export function soles(n) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
}

export function formatFecha(iso) {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export const ESTADO_PAGO_LABEL = { pendiente: "Pendiente", parcial: "Pago parcial", pagado: "Pagado" };

export const TIPO_COMPROBANTE_LABEL = { boleta: "Boleta", factura: "Factura" };

// RUC peruano: 11 dígitos, prefijo 10/15/16/17/20 y dígito verificador
// (módulo 11 de SUNAT). Misma regla que backend/src/lib/ruc.js.
const PESOS_RUC = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function rucValido(ruc) {
  if (!/^(10|15|16|17|20)\d{9}$/.test(ruc || "")) return false;
  const suma = PESOS_RUC.reduce((total, peso, i) => total + peso * Number(ruc[i]), 0);
  return (11 - (suma % 11)) % 10 === Number(ruc[10]);
}
