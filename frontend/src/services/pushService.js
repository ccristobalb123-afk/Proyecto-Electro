import { apiClient } from "./apiClient";

export async function obtenerClavePublica() {
  return apiClient.get("/notificaciones/vapid-public-key");
}

export async function suscribir(suscripcion) {
  return apiClient.post("/notificaciones/suscribir", suscripcion);
}

export async function desuscribir(endpoint) {
  return apiClient.post("/notificaciones/desuscribir", { endpoint });
}
