import { apiClient } from "./apiClient";

export async function listarUsuarios({ q, signal } = {}) {
  return apiClient.get("/usuarios", { q }, { signal });
}

export async function crearUsuario({ usuario, nombre, correo, esSuperAdmin, modulos, empresas }) {
  // El backend genera una contraseña temporal y la devuelve para
  // mostrarla en pantalla (además de intentar mandarla por correo).
  return apiClient.post("/usuarios", { usuario, nombre, correo, esSuperAdmin, modulos, empresas });
}

export async function actualizarUsuario(usuarioId, { usuario, nombre, correo, esSuperAdmin, modulos, empresas }) {
  return apiClient.patch(`/usuarios/${usuarioId}`, { usuario, nombre, correo, esSuperAdmin, modulos, empresas });
}

export async function resetearPassword(usuarioId) {
  // Genera una contraseña temporal nueva, la devuelve para mostrarla en
  // pantalla, y además intenta mandarla por correo.
  return apiClient.post(`/usuarios/${usuarioId}/reset-password`);
}

export async function cambiarEstadoUsuario(usuarioId, activo) {
  return apiClient.patch(`/usuarios/${usuarioId}`, { activo });
}
