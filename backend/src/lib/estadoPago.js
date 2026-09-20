// Los montos vienen de Prisma como Decimal (no number nativo) — Number()
// los convierte para poder sumarlos y comparalos sin sorpresas.
export function totalPagado(pagos) {
  return pagos.reduce((acc, p) => acc + Number(p.monto), 0);
}

// Cuando la factura está sujeta a detracción, lo que se cobra/paga por
// los canales normales no es montoTotal completo — el monto de
// detracción se deposita aparte, directo a la cuenta de detracciones
// del Banco de la Nación. Este es el monto real contra el que hay que
// medir pagos y saldo pendiente.
export function montoNetoAPagar(montoTotal, montoDetraccion) {
  return Number(montoTotal) - Number(montoDetraccion || 0);
}

// Pendiente/Parcial/Pagado nunca se guarda — se calcula al leer,
// comparando el monto neto (montoTotal menos detracción, si aplica)
// contra la suma de sus pagos.
export function calcularEstadoPago(montoNeto, pagos) {
  const pagado = totalPagado(pagos);
  if (pagado <= 0) return "pendiente";
  if (pagado < Number(montoNeto)) return "parcial";
  return "pagado";
}
