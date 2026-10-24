import { apiClient } from "./apiClient";

export const ESTADOS_EQUIPO = {
  disponible: "Disponible",
  asignado: "Asignado",
  mantenimiento: "Mantenimiento",
  vencido: "Vencido",
  debaja: "De baja",
};

// Tipos de equipo con sus reglas, en su orden: [{ id, nombre, destino:
// "camion"|"persona", variasPorDestinatario, activo, campos: ["codigo",
// "marca", ..., "fechaInspeccion", "fechaVencimiento"], identificador }].
// Los que admiten equipos nuevos más los desactivados que aún tienen equipos.
export async function listarCategorias() {
  return apiClient.get("/categorias-equipo");
}

// Todos los tipos con cuántos equipos tienen (pantalla "Tipos de equipo").
export async function listarTiposGestion() {
  return apiClient.get("/categorias-equipo/gestion");
}

// { nombre, destino, variasPorDestinatario, camposRequeridos } — cualquier
// usuario de Operaciones.
export async function crearTipo(datos) {
  return apiClient.post("/categorias-equipo", datos);
}

// Corregir o desactivar/reactivar ({ activo }) — solo SuperAdmin.
export async function actualizarTipo(id, datos) {
  return apiClient.patch(`/categorias-equipo/${id}`, datos);
}

// Solo SuperAdmin y solo si el tipo no tiene equipos.
export async function eliminarTipo(id) {
  return apiClient.delete(`/categorias-equipo/${id}`);
}

export async function listarEquipos({ empresa, categoria, estado, q, signal } = {}) {
  return apiClient.get("/equipos", { empresa, categoria, estado, q }, { signal });
}

// fotos: 2 elementos, cada uno "actual" (mantener) o una foto nueva. El
// equipo queda siempre con 2; la reemplazada va al historial.
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

// Un equipo vencido no pasa a Disponible por acá: se renuevan sus fechas
// con registrarInspeccion ("Actualizar inspección").
export async function cambiarEstadoEquipo(equipoId, estado) {
  return apiClient.patch(`/equipos/${equipoId}/estado`, { estado });
}

// Asigna (o reasigna) el equipo a UN destinatario de cualquier empresa:
// { vehiculoId } para un camión o { personalId } para una persona.
export async function asignarEquipo(equipoId, destino) {
  return apiClient.patch(`/equipos/${equipoId}/estado`, { estado: "asignado", ...destino });
}

// Para el modal "Asignar equipo": solo los destinatarios que admite el
// tipo del equipo (de todas las empresas). { destino: "camion"|"persona",
// tipoEquipo, camiones: [...], personas: [...] }; cada uno puede traer
// `bloqueo` (por qué no se puede elegir) o `actual` (ya lo tiene).
export async function listarDestinatarios(equipoId) {
  return apiClient.get(`/equipos/${equipoId}/destinatarios`);
}

// Pestaña Asignaciones: [{ tipo: "persona"|"camion", id, nombre, detalle,
// vencidos, equipos: [{ id, identificador, campoIdentificador, categoria,
// estado, vencimiento, vencido }] }].
export async function listarAsignacionesActuales({ signal } = {}) {
  return apiClient.get("/equipos/asignaciones-actuales", {}, { signal });
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

// "Actualizar inspección": { fechaInspeccion, fechaVencimiento,
// diasAnticipacion, resultado, fotos: ["actual" | foto nueva, …],
// dejarDisponible }. Siempre interna (no se manda el tipo).
export async function registrarInspeccion(equipoId, datosInspeccion) {
  return apiClient.post(`/equipos/${equipoId}/inspecciones`, datosInspeccion);
}

// Por id: los equipos sin código también tienen hoja de vida.
export async function obtenerHojaDeVida(equipoId) {
  return apiClient.get(`/equipos/${equipoId}/historial`);
}
