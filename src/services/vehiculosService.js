import { apiClient, delay } from "./apiClient";

const MOCK_MODE = true;

export const TIPOS_UNIDAD = ["Camioneta", "Camión", "Minivan", "Grúa", "Auto"];
const DOCS_BASE = ["SOAT", "Revisión técnica", "Tarjeta de circulación", "Seguro", "Permiso de operación"];

let vehiculosMock = [
  {
    id: 1,
    placa: "ABC-123",
    tipoUnidad: "Camión",
    empresaDueña: "corevex",
    empresaUso: "corevex",
    cuadrilla: "Cuadrilla Yerson H.",
    documentos: [
      { tipo: "SOAT", dias: 22, estado: "amber", archivo: true },
      { tipo: "Revisión técnica", dias: 95, estado: "gray", archivo: true },
      { tipo: "Tarjeta de circulación", dias: 210, estado: "gray", archivo: true },
      { tipo: "Seguro", dias: 5, estado: "red", archivo: false },
      { tipo: "Permiso de operación", dias: 150, estado: "gray", archivo: true },
    ],
  },
  {
    id: 2,
    placa: "DEF-456",
    tipoUnidad: "Grúa",
    empresaDueña: "electro",
    empresaUso: "corevex",
    cuadrilla: "Proyecto Tecsur — LDS",
    documentos: [
      ...DOCS_BASE.map((tipo) => ({ tipo, dias: 60, estado: "gray", archivo: true })),
      { tipo: "Brazo hidráulico", dias: 40, estado: "amber", archivo: true },
    ],
  },
];

const HISTORIAL_VEHICULO_MOCK = {
  "ABC-123": [
    { titulo: "SOAT renovado", fecha: "10 mar 2026", tone: "success" },
    { titulo: "Registrado en el sistema", fecha: "02 ene 2026" },
  ],
  "DEF-456": [{ titulo: "Registrado en el sistema", fecha: "18 feb 2026" }],
};

export async function listarVehiculos({ empresa, tipoUnidad, q } = {}) {
  if (MOCK_MODE) {
    await delay();
    return vehiculosMock.filter((v) => {
      if (empresa && v.empresaDueña !== empresa) return false;
      if (tipoUnidad && v.tipoUnidad !== tipoUnidad) return false;
      if (q && !v.placa.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }
  // TODO backend: GET /api/vehiculos?empresa=&tipoUnidad=&q=
  return apiClient.get("/vehiculos", { empresa, tipoUnidad, q });
}

export async function crearVehiculo({ placa, tipoUnidad, empresa, cuadrilla }) {
  if (MOCK_MODE) {
    await delay();
    const nuevo = {
      id: Date.now(),
      placa: placa.trim(),
      tipoUnidad,
      empresaDueña: empresa,
      empresaUso: empresa,
      cuadrilla,
      // Antes esto quedaba en [] para vehículos que no son Grúa, así que
      // el modal de Documentos no tenía ninguna fila donde adjuntar nada
      // recién creado el vehículo. Ahora siempre arranca con los 5
      // documentos base (sin adjuntar todavía), más el de Grúa si aplica.
      documentos: [
        ...DOCS_BASE.map((tipo) => ({ tipo, dias: null, estado: "gray", archivo: false })),
        ...(tipoUnidad === "Grúa" ? [{ tipo: "Brazo hidráulico", dias: null, estado: "gray", archivo: false }] : []),
      ],
    };
    vehiculosMock = [nuevo, ...vehiculosMock];
    return nuevo;
  }
  // TODO backend: POST /api/vehiculos { placa, tipoUnidad, empresa, cuadrilla }
  // — el backend crea también los documentos base sin adjuntar.
  return apiClient.post("/vehiculos", { placa, tipoUnidad, empresa, cuadrilla });
}

export async function agregarDocumento(vehiculoId, documento) {
  if (MOCK_MODE) {
    await delay();
    vehiculosMock = vehiculosMock.map((v) =>
      v.id === vehiculoId ? { ...v, documentos: [...v.documentos, documento] } : v
    );
    return vehiculosMock.find((v) => v.id === vehiculoId);
  }
  // TODO backend: POST /api/vehiculos/:id/documentos { tipo, fechaVencimiento, archivo }
  return apiClient.post(`/vehiculos/${vehiculoId}/documentos`, documento);
}

export async function obtenerHistorial(placa) {
  if (MOCK_MODE) {
    await delay(300);
    return HISTORIAL_VEHICULO_MOCK[placa] || [];
  }
  // TODO backend: GET /api/vehiculos/:placa/historial
  return apiClient.get(`/vehiculos/${placa}/historial`);
}
