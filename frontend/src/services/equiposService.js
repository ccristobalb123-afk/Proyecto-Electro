import { apiClient } from "./apiClient";

export const ESTADOS_EQUIPO = {
  disponible: "Disponible",
  asignado: "Asignado",
  mantenimiento: "Mantenimiento",
  vencido: "Vencido",
  debaja: "De baja",
};

// Los 9 tipos de equipo con sus campos obligatorios, en el orden de la
// tabla: [{ nombre, tipo, campos: ["codigo", "marca", ...], identificador }].
// Fijos: ya no se crean ni editan desde la aplicación.
export async function listarCategorias() {
  return apiClient.get("/categorias-equipo");
}

export async function listarEquipos({ empresa, categoria, estado, q, signal } = {}) {
  return apiClient.get("/equipos", { empresa, categoria, estado, q }, { signal });
}

export async function actualizarFotosEquipo(equipoId, fotos) {
  return apiClient.patch(`/equipos/${equipoId}/fotos`, { fotos });
}

// `datos`: categoria, empresa, fotos y SOLO los campos del tipo elegido
// (ver valoresParaEnviar en CamposEquipo.jsx). El backend exige los
// obligatorios del tipo y que el código/serial no se repita en ese tipo.
export async function crearEquipo(datos) {
  return apiClient.post("/equipos", datos);
}

// Sin empresa (ver nota en equipos.service.js del backend sobre por qué
// eso no se edita).
export async function actualizarEquipo(equipoId, datos) {
  return apiClient.patch(`/equipos/${equipoId}`, datos);
}

export async function eliminarEquipo(equipoId) {
  return apiClient.delete(`/equipos/${equipoId}`);
}

export async function cambiarEstadoEquipo(equipoId, estado) {
  return apiClient.patch(`/equipos/${equipoId}/estado`, { estado });
}

// Asigna el equipo a un camión ya registrado (no a un texto libre ni a
// una persona) — el vehículo viene de vehiculosService.listarVehiculos().
export async function asignarEquipo(equipoId, vehiculo) {
  return apiClient.patch(`/equipos/${equipoId}/estado`, { estado: "asignado", vehiculoId: vehiculo.id });
}

// Envía el equipo a mantenimiento, exigiendo un comentario de qué tiene.
export async function enviarAMantenimiento(equipoId, comentario) {
  return apiClient.patch(`/equipos/${equipoId}/estado`, { estado: "mantenimiento", comentario });
}

export async function devolverEquipo(equipoId) {
  return apiClient.patch(`/equipos/${equipoId}/estado`, { estado: "disponible" });
}

export async function darDeBajaEquipo(equipoId, motivo) {
  return apiClient.patch(`/equipos/${equipoId}/dar-de-baja`, { motivo });
}

export async function registrarInspeccion(equipoId, datosInspeccion) {
  return apiClient.post(`/equipos/${equipoId}/inspecciones`, datosInspeccion);
}

// Por id: los equipos sin código también tienen hoja de vida.
export async function obtenerHojaDeVida(equipoId) {
  return apiClient.get(`/equipos/${equipoId}/historial`);
}
