import { apiClient } from "./apiClient";

export function totalPagado(pagos) {
  return pagos.reduce((acc, p) => acc + p.monto, 0);
}

// Cuando el documento aplica detracción, lo que se cobra/paga por los
// canales normales no es montoTotal completo — el monto de detracción
// se deposita aparte, directo a la cuenta de detracciones del Banco de
// la Nación. Mismo criterio que el backend (lib/estadoPago.js),
// replicado acá para que la UI muestre el saldo correcto sin esperar
// un viaje al servidor.
export function montoNetoAPagar(doc) {
  return doc.montoTotal - (doc.montoDetraccion || 0);
}

export function estadoPago(doc) {
  const pagado = totalPagado(doc.pagos);
  const neto = montoNetoAPagar(doc);
  if (pagado <= 0) return "pendiente";
  if (pagado < neto) return "parcial";
  return "pagado";
}

// ---- Facturas (por cobrar) ----
export async function listarFacturas({ empresa, estado, q, signal } = {}) {
  return apiClient.get("/facturas", { empresa, estado, q }, { signal });
}

export async function crearFactura(datos) {
  // El backend valida serie+número únicos por empresa, y resuelve el
  // código de detracción contra el catálogo (el % que vale es el de
  // ese momento, no el que el navegador tenía cacheado).
  return apiClient.post("/facturas", datos);
}

export async function actualizarFactura(facturaId, datos) {
  return apiClient.patch(`/facturas/${facturaId}`, datos);
}

export async function anularFactura(facturaId) {
  // El backend rechaza anular si ya tiene pagos registrados (ahí se
  // necesita una nota de crédito, no un simple anular).
  return apiClient.post(`/facturas/${facturaId}/anular`);
}

export async function anularFacturaPorPagar(facturaId) {
  return apiClient.post(`/facturas-por-pagar/${facturaId}/anular`);
}

export async function adjuntarComprobanteFactura(facturaId, archivoNombre, archivoUrl) {
  return apiClient.post(`/facturas/${facturaId}/comprobante`, { archivoNombre, archivoUrl });
}

export async function registrarPagoFactura(facturaId, monto) {
  return apiClient.post(`/facturas/${facturaId}/pagos`, { monto });
}

// ---- Facturas por pagar ----
export async function listarFacturasPorPagar({ empresa, estado, q, signal } = {}) {
  return apiClient.get("/facturas-por-pagar", { empresa, estado, q }, { signal });
}

export async function crearFacturaPorPagar(datos) {
  return apiClient.post("/facturas-por-pagar", datos);
}

export async function actualizarFacturaPorPagar(facturaId, datos) {
  return apiClient.patch(`/facturas-por-pagar/${facturaId}`, datos);
}

export async function registrarPagoFacturaPorPagar(facturaId, monto) {
  return apiClient.post(`/facturas-por-pagar/${facturaId}/pagos`, { monto });
}

export async function adjuntarComprobanteFacturaPorPagar(facturaId, archivoNombre, archivoUrl) {
  return apiClient.post(`/facturas-por-pagar/${facturaId}/comprobante`, { archivoNombre, archivoUrl });
}
