import { apiClient } from "./apiClient";

// Avisos de vencimiento (vencidos recientes, vencen hoy y por vencer),
// ya ordenados por urgencia y con el mismo texto que el push. Sin
// `limit`, la lista completa (la campana la necesita entera).
export async function listarAlertas({ limit } = {}) {
  return apiClient.get("/dashboard/alertas", { limit });
}

export async function listarActividadReciente({ limit = 4 } = {}) {
  return apiClient.get("/dashboard/actividad-reciente", { limit });
}

export async function obtenerKpis() {
  return apiClient.get("/dashboard/kpis");
}

export async function obtenerComparativo() {
  return apiClient.get("/dashboard/comparativo");
}
