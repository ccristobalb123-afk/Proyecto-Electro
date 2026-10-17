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

// fechas: { fechaInspeccion, fechaVencimiento } — solo para dejar
// Disponible un equipo vencido (se renuevan sus fechas).
export async function cambiarEstadoEquipo(equipoId, estado, fechas = {}) {
  return apiClient.patch(`/equipos/${equipoId}/estado`, { estado, ...fechas });
}

// Asigna (o reasigna) el equipo a UN destinatario de cualquier empresa:
// { vehiculoId } para un camión o { personalId } para una persona.
export async function asignarEquipo(equipoId, destino) {
  return apiClient.patch(`/equipos/${equipoId}/estado`, { estado: "asignado", ...destino });
}

// { camiones: [{ id, placa, tipoUnidad, cuadrilla, empresa }], personas: [{ id, nombre, dni, empresas }] }
// de todas las empresas, para el modal "Asignar equipo".
export async function listarDestinatarios() {
  return apiClient.get("/equipos/destinatarios");
}

// Quién tuvo el equipo, desde y hasta cuándo (la más reciente primero).
export async function obtenerAsignaciones(equipoId) {
  return apiClient.get(`/equipos/${equipoId}/asignaciones`);
}

// Envía el equipo a mantenimiento, exigiendo un comentario de qué tiene.
export async function enviarAMantenimiento(equipoId, comentario) {
  return apiClient.patch(`/equipos/${equipoId}/estado`, { estado: "mantenimiento", comentario });
}

// Devolver = pasar a Disponible: el backend cierra la asignación.
// Queda Disponible, o se sigue viendo Vencido si su fecha ya pasó (hay que renovar sus fechas).
export async function devolverEquipo(equipoId) {
  return apiClient.post(`/equipos/${equipoId}/devolver`);
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
