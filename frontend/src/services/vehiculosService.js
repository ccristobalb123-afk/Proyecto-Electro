import { apiClient } from "./apiClient";

export const TIPOS_UNIDAD = ["Camioneta", "Camión", "Minivan", "Grúa", "Auto"];

export async function listarVehiculos({ empresa, tipoUnidad, q, signal } = {}) {
  return apiClient.get("/vehiculos", { empresa, tipoUnidad, q }, { signal });
}

export async function crearVehiculo({ placa, tipoUnidad, empresa, cuadrilla }) {
  // El backend crea también los documentos base sin adjuntar.
  return apiClient.post("/vehiculos", { placa, tipoUnidad, empresa, cuadrilla });
}

// Solo placa y cuadrilla — no tipoUnidad ni empresa (ver nota en
// vehiculos.service.js del backend sobre por qué esos 2 no se editan).
export async function actualizarVehiculo(vehiculoId, { placa, cuadrilla }) {
  return apiClient.patch(`/vehiculos/${vehiculoId}`, { placa, cuadrilla });
}

export async function eliminarVehiculo(vehiculoId) {
  return apiClient.delete(`/vehiculos/${vehiculoId}`);
}

// El documento se identifica por su id real (no por posición en el
// array — la posición puede cambiar de orden, el id nunca).
export async function actualizarDocumento(vehiculoId, documentoId, datos) {
  return apiClient.patch(`/vehiculos/${vehiculoId}/documentos/${documentoId}`, datos);
}

export async function obtenerHistorial(placa) {
  return apiClient.get(`/vehiculos/${placa}/historial`);
}
