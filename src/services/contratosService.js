import { apiClient, delay } from "./apiClient";

const MOCK_MODE = true;

let contratosMock = [
  { id: 1, trabajador: "J. Ramírez Soto", iniciales: "JR", empresa: "corevex", tipo: "Plazo fijo", vence: "28 ago 2026", estado: "vencido", archivo: true },
  { id: 2, trabajador: "S. Vega Luna", iniciales: "SV", empresa: "electro", tipo: "Indefinido", vence: "01 sep 2026", estado: "porvencer", archivo: true },
  { id: 3, trabajador: "Milagros Ríos", iniciales: "MR", empresa: "corevex", tipo: "Plazo fijo", vence: "14 nov 2026", estado: "vigente", archivo: true },
  { id: 4, trabajador: "Alonso Torres", iniciales: "AT", empresa: "electro", tipo: "Indefinido", vence: "03 dic 2026", estado: "vigente", archivo: true },
  { id: 5, trabajador: "Pedro Castañeda", iniciales: "PC", empresa: "corevex", tipo: "Plazo fijo", vence: "20 jun 2026", estado: "renovado", archivo: true },
  { id: 6, trabajador: "Lucía Farfán", iniciales: "LF", empresa: "electro", tipo: "Plazo fijo", vence: "10 mar 2026", estado: "terminado", archivo: false },
];

export async function listarContratos({ empresa, estado, q } = {}) {
  if (MOCK_MODE) {
    await delay();
    return contratosMock.filter((c) => {
      if (empresa && c.empresa !== empresa) return false;
      if (estado && c.estado !== estado) return false;
      if (q && !c.trabajador.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }
  // TODO backend: GET /api/contratos?empresa=&estado=&q=
  return apiClient.get("/contratos", { empresa, estado, q });
}

export async function crearContrato(datos) {
  if (MOCK_MODE) {
    await delay();
    const nuevo = {
      id: Date.now(),
      trabajador: datos.trabajador,
      iniciales: datos.trabajador.split(" ").map((p) => p[0]).slice(0, 2).join(""),
      empresa: datos.empresa,
      tipo: datos.tipo,
      vence: datos.fechaFin,
      estado: "vigente",
      archivo: !!datos.archivoNombre,
    };
    contratosMock = [nuevo, ...contratosMock];
    return nuevo;
  }
  // TODO backend: POST /api/contratos { ...datos } — el backend calcula el
  // estado inicial (Vigente/Por vencer) según fechaFin, y si fechaFin -
  // diasAnticipacion <= hoy, crea la Alerta correspondiente.
  return apiClient.post("/contratos", datos);
}
