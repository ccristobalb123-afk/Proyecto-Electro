import { apiClient, delay, setAuthToken, getAuthToken } from "./apiClient";

// TODO backend: apagar este flag cuando exista POST /api/auth/login real.
// Mientras esté en true, las funciones de abajo simulan el backend con
// datos fijos (sin llamar a apiClient) para no bloquear el resto del
// desarrollo del frontend.
const MOCK_MODE = true;

// TODO backend: tabla Usuario con columna rol (ADMINISTRADOR|SUPERVISOR|USUARIO)
// y tabla RolModulo (o similar) para los módulos permitidos por rol.
const USUARIOS_MOCK = [
  {
    id: 1,
    correo: "admin@electro.pe",
    clave: "cualquier-cosa", // en mock, cualquier contraseña vale
    nombre: "Cristian Corahua",
    iniciales: "CC",
    rol: "ADMINISTRADOR",
    empresas: ["Corevex", "Electro"],
    requiereMfa: true,
    modulos: ["dashboard", "rrhh", "operaciones", "finanzas", "administracion"],
  },
  {
    id: 2,
    correo: "supervisor@electro.pe",
    clave: "cualquier-cosa",
    nombre: "Milagros Ríos",
    iniciales: "MR",
    rol: "SUPERVISOR",
    empresas: ["Corevex", "Electro"],
    requiereMfa: false,
    modulos: ["dashboard", "rrhh", "operaciones"],
  },
  {
    id: 3,
    correo: "usuario@electro.pe",
    clave: "cualquier-cosa",
    nombre: "Alonso Torres",
    iniciales: "AT",
    rol: "USUARIO",
    empresas: ["Corevex"],
    requiereMfa: false,
    modulos: ["dashboard", "operaciones"],
  },
];

function sanear(usuario) {
  // Nunca devolver la contraseña, ni siquiera desde el mock.
  const { clave: _clave, ...resto } = usuario;
  return resto;
}

function generarTokenFalso(usuarioId) {
  return `mock-token-${usuarioId}-${Date.now()}`;
}

// Persistimos solo el ID de usuario en localStorage (no el token, no la
// contraseña) para poder "recordar la sesión" entre recargas en modo
// mock. TODO backend: con backend real esto se reemplaza por una cookie
// httpOnly de sesión o por refrescar el token vía /api/auth/refresh.
const CLAVE_STORAGE = "electro_sesion_usuario_id";

/**
 * Paso 1 del login: valida correo/clave.
 * Devuelve { requiereMfa: true } si hace falta un segundo factor
 * (actualmente solo ADMINISTRADOR), o { requiereMfa: false, usuario, token }
 * si el login ya quedó completo.
 */
export async function login(correo, clave) {
  if (MOCK_MODE) {
    await delay(500);
    const usuario = USUARIOS_MOCK.find((u) => u.correo.toLowerCase() === correo.trim().toLowerCase());
    if (!usuario || !clave) {
      throw new Error("Correo o contraseña incorrectos.");
    }
    if (usuario.requiereMfa) {
      return { requiereMfa: true, correo: usuario.correo };
    }
    const token = generarTokenFalso(usuario.id);
    setAuthToken(token);
    localStorage.setItem(CLAVE_STORAGE, String(usuario.id));
    return { requiereMfa: false, usuario: sanear(usuario), token };
  }

  // TODO backend: POST /api/auth/login { correo, clave }
  const data = await apiClient.post("/auth/login", { correo, clave });
  if (!data.requiereMfa) setAuthToken(data.token);
  return data;
}

/** Paso 2 del login (solo si `login` devolvió requiereMfa: true). */
export async function verificarMfa(correo, codigo) {
  if (MOCK_MODE) {
    await delay(400);
    if (codigo.replace(/\s/g, "").length !== 6) {
      throw new Error("El código debe tener 6 dígitos.");
    }
    const usuario = USUARIOS_MOCK.find((u) => u.correo.toLowerCase() === correo.toLowerCase());
    if (!usuario) throw new Error("No se pudo verificar el código.");
    const token = generarTokenFalso(usuario.id);
    setAuthToken(token);
    localStorage.setItem(CLAVE_STORAGE, String(usuario.id));
    return { usuario: sanear(usuario), token };
  }

  // TODO backend: POST /api/auth/verify-mfa { correo, codigo }
  const data = await apiClient.post("/auth/verify-mfa", { correo, codigo });
  setAuthToken(data.token);
  return data;
}

/** Siempre responde igual, exista o no el correo (no confirmar existencia). */
export async function recuperarPassword(correo) {
  if (MOCK_MODE) {
    await delay(500);
    return { ok: true };
  }
  // TODO backend: POST /api/auth/forgot-password { correo }
  return apiClient.post("/auth/forgot-password", { correo });
}

/**
 * Recupera la sesión activa al recargar la página (F5), a partir del
 * token/id guardado. Si no hay sesión válida, devuelve null.
 * La llama el AuthContext una sola vez, al montar la app.
 */
export async function obtenerUsuarioActual() {
  if (MOCK_MODE) {
    await delay(250);
    const id = localStorage.getItem(CLAVE_STORAGE);
    if (!id) return null;
    const usuario = USUARIOS_MOCK.find((u) => u.id === Number(id));
    if (!usuario) return null;
    if (!getAuthToken()) setAuthToken(generarTokenFalso(usuario.id));
    return sanear(usuario);
  }
  // TODO backend: GET /api/auth/me (usando la cookie de sesión o el
  // token guardado) — si el token venció, debe responder 401 y el
  // apiClient ya dispara automáticamente el evento de sesión expirada.
  return apiClient.get("/auth/me");
}

export async function cambiarPassword(passwordActual, passwordNueva) {
  if (MOCK_MODE) {
    await delay(400);
    return { ok: true };
  }
  // TODO backend: POST /api/auth/cambiar-password { passwordActual, passwordNueva }
  return apiClient.post("/auth/cambiar-password", { passwordActual, passwordNueva });
}

export async function logout() {
  setAuthToken(null);
  localStorage.removeItem(CLAVE_STORAGE);
  if (!MOCK_MODE) {
    // TODO backend: POST /api/auth/logout (para invalidar el token/cookie
    // del lado del servidor también, no solo borrarlo del cliente).
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Si falla, igual seguimos con el logout local.
    }
  }
}
