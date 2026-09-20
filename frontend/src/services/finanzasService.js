import { apiClient } from "./apiClient";

// Antes CATEGORIAS_GASTO era un array fijo importado directamente.
// Ahora vive en la base de datos.
export async function listarCategoriasGasto() {
  return apiClient.get("/categorias-gasto");
}

export async function agregarCategoriaGasto(nombre) {
  const { nombre: nombreCreado } = await apiClient.post("/categorias-gasto", { nombre });
  return nombreCreado;
}

// Se identifican por su nombre ACTUAL, no por un id — las categorías
// de gasto siempre viajaron como una simple lista de nombres, nunca
// como objetos con id.
export async function actualizarCategoriaGasto(nombreActual, nombreNuevo) {
  const { nombre } = await apiClient.patch(`/categorias-gasto/${encodeURIComponent(nombreActual)}`, { nombre: nombreNuevo });
  return nombre;
}

export async function eliminarCategoriaGasto(nombre) {
  return apiClient.delete(`/categorias-gasto/${encodeURIComponent(nombre)}`);
}

export async function listarGastos({ empresa, q, signal } = {}) {
  return apiClient.get("/gastos", { empresa, q }, { signal });
}

export async function crearGasto(datos) {
  return apiClient.post("/gastos", datos);
}

export async function actualizarGasto(gastoId, datos) {
  return apiClient.patch(`/gastos/${gastoId}`, datos);
}

export async function eliminarGasto(gastoId) {
  return apiClient.delete(`/gastos/${gastoId}`);
}

export async function adjuntarComprobanteGasto(gastoId, archivoNombre, archivoUrl) {
  return apiClient.post(`/gastos/${gastoId}/comprobante`, { archivoNombre, archivoUrl });
}
