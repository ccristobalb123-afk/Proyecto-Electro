import { apiClient, delay } from "./apiClient";

// TODO backend: apagar cuando exista GET /api/usuarios real.
const MOCK_MODE = true;

// TODO backend: tabla Usuario. El rol define qué módulos ve cada quien
// (ver NAV_ITEMS en AppShell y ProtectedRoute) — mantener estos 3 roles
// consistentes con los que usa authService: ADMINISTRADOR, SUPERVISOR, USUARIO.
let usuariosMock = [
  { id: 1, nombre: "Cristian Corahua", correo: "admin@electro.pe", rol: "ADMINISTRADOR", empresas: ["corevex", "electro"], activo: true },
  { id: 2, nombre: "Milagros Ríos", correo: "supervisor@electro.pe", rol: "SUPERVISOR", empresas: ["corevex"], activo: true },
  { id: 3, nombre: "Alonso Torres", correo: "usuario@electro.pe", rol: "USUARIO", empresas: ["electro"], activo: true },
  { id: 4, nombre: "Yerson Huamán", correo: "yerson@corevex.pe", rol: "USUARIO", empresas: ["corevex"], activo: false },
];

export async function listarUsuarios({ rol, q } = {}) {
  if (MOCK_MODE) {
    await delay();
    return usuariosMock.filter((u) => {
      if (rol && u.rol !== rol) return false;
      if (q && !u.nombre.toLowerCase().includes(q.toLowerCase()) && !u.correo.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }
  // TODO backend: GET /api/usuarios?rol=&q=
  return apiClient.get("/usuarios", { rol, q });
}

export async function crearUsuario({ nombre, correo, rol, empresas }) {
  if (MOCK_MODE) {
    await delay();
    const nuevo = { id: Date.now(), nombre: nombre.trim(), correo: correo.trim(), rol, empresas, activo: true };
    usuariosMock = [nuevo, ...usuariosMock];
    return nuevo;
  }
  // TODO backend: POST /api/usuarios { nombre, correo, rol, empresas } —
  // el backend genera una contraseña temporal y la envía al correo.
  return apiClient.post("/usuarios", { nombre, correo, rol, empresas });
}

export async function resetearPassword(usuarioId) {
  if (MOCK_MODE) {
    await delay();
    return { ok: true };
  }
  // TODO backend: POST /api/usuarios/:id/reset-password — genera una
  // contraseña temporal nueva y la envía al correo del usuario.
  return apiClient.post(`/usuarios/${usuarioId}/reset-password`);
}

export async function cambiarEstadoUsuario(usuarioId, activo) {
  if (MOCK_MODE) {
    await delay();
    usuariosMock = usuariosMock.map((u) => (u.id === usuarioId ? { ...u, activo } : u));
    return usuariosMock.find((u) => u.id === usuarioId);
  }
  // TODO backend: PATCH /api/usuarios/:id { activo }
  return apiClient.patch(`/usuarios/${usuarioId}`, { activo });
}
