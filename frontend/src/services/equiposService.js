import { apiClient } from "./apiClient";

export const ESTADOS_EQUIPO = {
  disponible: "Disponible",
  asignado: "Asignado",
  mantenimiento: "Mantenimiento",
  vencido: "Vencido",
  debaja: "De baja",
};

// Antes CATEGORIAS era un objeto fijo importado directamente. Ahora
// vive en la base de datos — hay que pedirlo (ver useOperacionesManager,
// que lo carga una vez al montar y lo pasa como prop a quien lo necesite).
export async function listarCategorias() {
  return apiClient.get("/categorias-equipo");
}

export async function agregarCategoria(nombre, campos) {
  const { nombre: nombreCreado } = await apiClient.post("/categorias-equipo", { nombre, campos });
  return nombreCreado;
}

// Se identifican por su nombre ACTUAL, no por un id — las categorías
// de equipo viajan como un objeto { nombre: campos }, no como una
// lista con id.
export async function actualizarCategoria(nombreActual, nombre, campos) {
  const { nombre: nombreFinal } = await apiClient.patch(`/categorias-equipo/${encodeURIComponent(nombreActual)}`, { nombre, campos });
  return nombreFinal;
}

export async function eliminarCategoria(nombre) {
  return apiClient.delete(`/categorias-equipo/${encodeURIComponent(nombre)}`);
}

export async function listarEquipos({ empresa, categoria, estado, q, signal } = {}) {
  return apiClient.get("/equipos", { empresa, categoria, estado, q }, { signal });
}

export async function actualizarFotosEquipo(equipoId, fotos) {
  return apiClient.patch(`/equipos/${equipoId}/fotos`, { fotos });
}

export async function crearEquipo({ codigo, categoria, empresa, camposValores, fotos }) {
  // El backend valida que el código no exista, y sube las fotos (acá
  // van en base64) a almacenamiento real, devolviendo sus URLs.
  return apiClient.post("/equipos", { codigo, categoria, empresa, camposValores, fotos });
}

// Solo código, categoría y campos personalizados — no empresa (ver
// nota en equipos.service.js del backend sobre por qué eso no se edita).
export async function actualizarEquipo(equipoId, { codigo, categoria, camposValores }) {
  return apiClient.patch(`/equipos/${equipoId}`, { codigo, categoria, camposValores });
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

export async function obtenerHojaDeVida(codigo) {
  return apiClient.get(`/equipos/${codigo}/historial`);
}
