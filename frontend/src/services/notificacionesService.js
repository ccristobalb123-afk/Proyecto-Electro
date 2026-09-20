import { apiClient } from "./apiClient";

// Motor central de "Vencimientos" — mezcla Contrato/Curso/Equipo/
// Vehículo/Factura por igual, ordenados por días restantes.
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
