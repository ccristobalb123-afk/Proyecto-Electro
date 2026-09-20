import { apiClient } from "./apiClient";

export async function listarCursos({ empresa, estado, q, signal } = {}) {
  return apiClient.get("/cursos-certificaciones", { empresa, estado, q }, { signal });
}

export async function crearCurso(datos) {
  return apiClient.post("/cursos-certificaciones", datos);
}

export async function actualizarCurso(cursoId, datos) {
  return apiClient.patch(`/cursos-certificaciones/${cursoId}`, datos);
}

export async function eliminarCurso(cursoId) {
  return apiClient.delete(`/cursos-certificaciones/${cursoId}`);
}
