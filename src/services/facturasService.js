import { apiClient, delay } from "./apiClient";

const MOCK_MODE = true;

let facturasMock = [
  { id: 1, empresa: "corevex", cliente: "Tecsur S.A.", serie: "F001", numero: "00821", montoTotal: 4720, fechaEmision: "2026-08-02", fechaVencimiento: "2026-09-01", pagos: [{ monto: 2000, fecha: "2026-08-15" }], aplicaDetraccion: true, archivo: true, anulada: false },
  { id: 2, empresa: "electro", cliente: "Luz del Sur", serie: "F001", numero: "00822", montoTotal: 2360, fechaEmision: "2026-08-05", fechaVencimiento: "2026-08-25", pagos: [], aplicaDetraccion: false, archivo: false, anulada: false },
  { id: 3, empresa: "corevex", cliente: "Coopsol", serie: "F002", numero: "00104", montoTotal: 8850, fechaEmision: "2026-07-20", fechaVencimiento: "2026-08-19", pagos: [{ monto: 8850, fecha: "2026-08-10" }], aplicaDetraccion: true, archivo: true, anulada: false },
];

let facturasPagarMock = [
  { id: 1, empresa: "corevex", proveedor: "Repuestos Lima SAC", motivo: "Repuestos camión ABC-123", montoTotal: 1350, fechaEmision: "2026-08-01", fechaVencimiento: "2026-08-20", pagos: [], archivo: true },
  { id: 2, empresa: "electro", proveedor: "Ferretería El Tornillo", motivo: "Materiales varios", montoTotal: 640, fechaEmision: "2026-08-08", fechaVencimiento: "2026-08-18", pagos: [{ monto: 640, fecha: "2026-08-14" }], archivo: false },
];

export function totalPagado(pagos) {
  return pagos.reduce((acc, p) => acc + p.monto, 0);
}

export function estadoPago(doc) {
  const pagado = totalPagado(doc.pagos);
  if (pagado <= 0) return "pendiente";
  if (pagado < doc.montoTotal) return "parcial";
  return "pagado";
}

function filtrarPorPersona(lista, { empresa, estado, q, campoPersona }) {
  return lista.filter((doc) => {
    if (empresa && doc.empresa !== empresa) return false;
    if (estado && estadoPago(doc) !== estado) return false;
    if (q && !doc[campoPersona].toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
}

export async function listarFacturas({ empresa, estado, q } = {}) {
  if (MOCK_MODE) {
    await delay();
    return filtrarPorPersona(facturasMock, { empresa, estado, q, campoPersona: "cliente" });
  }
  // TODO backend: GET /api/facturas?empresa=&estado=&cliente=&q=
  return apiClient.get("/facturas", { empresa, estado, q });
}

export async function crearFactura(datos) {
  if (MOCK_MODE) {
    await delay();
    const nueva = {
      id: Date.now(),
      empresa: datos.empresa,
      cliente: datos.cliente.trim(),
      serie: datos.serie.trim(),
      numero: datos.numero.trim(),
      montoTotal: Number(datos.montoTotal),
      fechaEmision: datos.fechaEmision,
      fechaVencimiento: datos.fechaVencimiento,
      pagos: [],
      aplicaDetraccion: datos.aplicaDetraccion,
      archivo: false,
      anulada: false,
    };
    facturasMock = [nueva, ...facturasMock];
    return nueva;
  }
  // TODO backend: POST /api/facturas { ...datos } — el backend calcula el
  // IGV (18%) a partir del monto y valida serie+número únicos.
  return apiClient.post("/facturas", datos);
}

export async function actualizarFactura(facturaId, datos) {
  if (MOCK_MODE) {
    await delay();
    facturasMock = facturasMock.map((f) =>
      f.id === facturaId
        ? {
            ...f,
            empresa: datos.empresa,
            cliente: datos.cliente.trim(),
            serie: datos.serie.trim(),
            numero: datos.numero.trim(),
            montoTotal: Number(datos.montoTotal),
            fechaEmision: datos.fechaEmision,
            fechaVencimiento: datos.fechaVencimiento,
            aplicaDetraccion: datos.aplicaDetraccion,
          }
        : f
    );
    return facturasMock.find((f) => f.id === facturaId);
  }
  // TODO backend: PATCH /api/facturas/:id { ...datos }
  return apiClient.patch(`/facturas/${facturaId}`, datos);
}

export async function anularFactura(facturaId) {
  if (MOCK_MODE) {
    await delay();
    facturasMock = facturasMock.map((f) => (f.id === facturaId ? { ...f, anulada: true } : f));
    return facturasMock.find((f) => f.id === facturaId);
  }
  // TODO backend: POST /api/facturas/:id/anular — debe validar que no
  // tenga pagos registrados, o exigir una nota de crédito si ya los tiene.
  return apiClient.post(`/facturas/${facturaId}/anular`);
}

export async function registrarPagoFactura(facturaId, monto) {
  if (MOCK_MODE) {
    await delay();
    const nuevoPago = { monto, fecha: new Date().toISOString().slice(0, 10) };
    facturasMock = facturasMock.map((f) => (f.id === facturaId ? { ...f, pagos: [...f.pagos, nuevoPago] } : f));
    return facturasMock.find((f) => f.id === facturaId);
  }
  // TODO backend: POST /api/facturas/:id/pagos { monto }
  return apiClient.post(`/facturas/${facturaId}/pagos`, { monto });
}

export async function listarFacturasPorPagar({ empresa, estado, q } = {}) {
  if (MOCK_MODE) {
    await delay();
    return filtrarPorPersona(facturasPagarMock, { empresa, estado, q, campoPersona: "proveedor" });
  }
  // TODO backend: GET /api/facturas-por-pagar?empresa=&estado=&proveedor=&q=
  return apiClient.get("/facturas-por-pagar", { empresa, estado, q });
}

export async function crearFacturaPorPagar(datos) {
  if (MOCK_MODE) {
    await delay();
    const nueva = {
      id: Date.now(),
      empresa: datos.empresa,
      proveedor: datos.proveedor.trim(),
      motivo: datos.motivo.trim(),
      montoTotal: Number(datos.montoTotal),
      fechaEmision: datos.fechaEmision,
      fechaVencimiento: datos.fechaVencimiento,
      pagos: [],
      archivo: false,
    };
    facturasPagarMock = [nueva, ...facturasPagarMock];
    return nueva;
  }
  // TODO backend: POST /api/facturas-por-pagar { ...datos }
  return apiClient.post("/facturas-por-pagar", datos);
}

export async function actualizarFacturaPorPagar(facturaId, datos) {
  if (MOCK_MODE) {
    await delay();
    facturasPagarMock = facturasPagarMock.map((f) =>
      f.id === facturaId
        ? {
            ...f,
            empresa: datos.empresa,
            proveedor: datos.proveedor.trim(),
            motivo: datos.motivo.trim(),
            montoTotal: Number(datos.montoTotal),
            fechaEmision: datos.fechaEmision,
            fechaVencimiento: datos.fechaVencimiento,
          }
        : f
    );
    return facturasPagarMock.find((f) => f.id === facturaId);
  }
  // TODO backend: PATCH /api/facturas-por-pagar/:id { ...datos }
  return apiClient.patch(`/facturas-por-pagar/${facturaId}`, datos);
}

export async function registrarPagoFacturaPorPagar(facturaId, monto) {
  if (MOCK_MODE) {
    await delay();
    const nuevoPago = { monto, fecha: new Date().toISOString().slice(0, 10) };
    facturasPagarMock = facturasPagarMock.map((f) => (f.id === facturaId ? { ...f, pagos: [...f.pagos, nuevoPago] } : f));
    return facturasPagarMock.find((f) => f.id === facturaId);
  }
  // TODO backend: POST /api/facturas-por-pagar/:id/pagos { monto }
  return apiClient.post(`/facturas-por-pagar/${facturaId}/pagos`, { monto });
}
