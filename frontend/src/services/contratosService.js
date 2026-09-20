import { apiClient } from "./apiClient";
import { subirArchivo } from "./uploadsService";

export async function listarContratos({ empresa, estado, q, signal } = {}) {
  return apiClient.get("/contratos", { empresa, estado, q }, { signal });
}

// El personal "registrado" es quien ya tiene al menos un contrato — es
// la única forma de dar de alta a alguien nuevo en el sistema. Cursos,
// Fotocheck y EMO solo pueden asignarse a alguien de esta lista, nunca
// crear una persona nueva desde ahí.
export async function listarTrabajadoresRegistrados({ q, signal } = {}) {
  return apiClient.get("/personal", { q }, { signal });
}

export async function crearContrato(datos) {
  // El backend calcula el estado (Vigente/Por vencer) según fechaFin,
  // no hace falta mandarlo.
  return apiClient.post("/contratos", datos);
}

export async function actualizarContrato(contratoId, datos) {
  return apiClient.patch(`/contratos/${contratoId}`, datos);
}

export async function eliminarContrato(contratoId) {
  return apiClient.delete(`/contratos/${contratoId}`);
}

export async function adjuntarArchivoContrato(contratoId, archivo) {
  const { url, nombre } = await subirArchivo(archivo);
  return apiClient.post(`/contratos/${contratoId}/documento`, { archivoNombre: nombre, archivoUrl: url });
}
