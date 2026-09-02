import { apiClient, delay } from "./apiClient";

const MOCK_MODE = true;

// TODO backend: GET /api/categorias-gasto — el usuario las crea, no vienen de fábrica.
export const CATEGORIAS_GASTO = ["Combustible", "Mantenimiento", "Bono", "Alquiler", "Otro/Varios"];

let gastosMock = [
  { id: 1, empresa: "corevex", categoria: "Combustible", monto: 380, fecha: "2026-08-12", proveedor: "Grifo Primax", descripcion: "", archivo: true },
  { id: 2, empresa: "electro", categoria: "Bono", monto: 200, fecha: "2026-08-10", trabajador: "Milagros Ríos", descripcion: "", archivo: false },
  { id: 3, empresa: "corevex", categoria: "Mantenimiento", monto: 520, fecha: "2026-08-09", proveedor: "Taller JR", descripcion: "Cambio de aceite grúa", archivo: true },
];

export async function listarGastos({ empresa, q } = {}) {
  if (MOCK_MODE) {
    await delay();
    return gastosMock.filter((g) => {
      if (empresa && g.empresa !== empresa) return false;
      if (q && !g.categoria.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }
  // TODO backend: GET /api/gastos?empresa=&mes=&categoria=&q=
  return apiClient.get("/gastos", { empresa, q });
}

export async function crearGasto(datos) {
  if (MOCK_MODE) {
    await delay();
    const nuevo = {
      id: Date.now(),
      empresa: datos.empresa,
      categoria: datos.categoria,
      monto: Number(datos.monto),
      fecha: datos.fecha,
      proveedor: datos.proveedor.trim(),
      trabajador: datos.trabajador.trim(),
      descripcion: datos.descripcion.trim(),
      archivo: false,
    };
    gastosMock = [nuevo, ...gastosMock];
    return nuevo;
  }
  // TODO backend: POST /api/gastos { ...datos }
  return apiClient.post("/gastos", datos);
}
