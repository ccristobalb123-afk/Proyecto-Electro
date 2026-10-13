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

// Suscripción push de este navegador, si existe (sin pedir permisos).
async function suscripcionDelNavegador() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  try {
    const registro = await navigator.serviceWorker.getRegistration();
    return (await registro?.pushManager.getSubscription()) || null;
  } catch {
    return null;
  }
}

/** Endpoint push de este dispositivo, para borrarlo del servidor al cerrar sesión. */
export async function endpointDeEsteDispositivo() {
  return (await suscripcionDelNavegador())?.endpoint;
}

/**
 * Después de iniciar sesión: si este navegador ya tenía las notificaciones
 * activadas, se vuelve a registrar la suscripción con la sesión nueva (al
 * cerrar sesión a propósito el servidor la había borrado). Nunca pide
 * permiso ni crea una suscripción nueva.
 */
export async function revincularSuscripcion() {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const suscripcion = await suscripcionDelNavegador();
  if (suscripcion) await suscribir(suscripcion.toJSON()).catch(() => {});
}
