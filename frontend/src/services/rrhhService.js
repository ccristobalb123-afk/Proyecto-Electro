import { apiClient } from "./apiClient";
import { subirArchivo } from "./uploadsService";

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

export async function adjuntarArchivoCurso(cursoId, archivo, opcionesSubida) {
  const { url, nombre } = await subirArchivo(archivo, opcionesSubida);
  return apiClient.post(`/cursos-certificaciones/${cursoId}/documento`, { archivoNombre: nombre, archivoUrl: url });
}
