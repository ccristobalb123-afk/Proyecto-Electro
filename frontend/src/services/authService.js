import { apiClient } from "./apiClient";

/**
 * Paso 1 del login: valida usuario/clave. El correo NUNCA sirve para
 * loguearse — solo para "olvidé mi contraseña" (ver recuperarPassword).
 * Si hace falta un segundo factor (hoy solo ADMINISTRADOR), devuelve
 * { requiereMfa: true, usuario, mfaConfigurado, mfaToken } — ese
 * mfaToken es el que prueba que la contraseña ya se validó, y hay que
 * mandarlo de vuelta en verificarMfa/iniciarConfiguracionMfa (nunca el
 * nombre de usuario suelto). Si requiereMfa es false, el login ya
 * quedó completo y el backend dejó las cookies de sesión puestas.
 */
export async function login(usuario, clave) {
  return apiClient.post("/auth/login", { usuario, clave });
}

/** Paso 2 del login (solo si `login` devolvió requiereMfa: true). */
export async function verificarMfa(mfaToken, codigo) {
  return apiClient.post("/auth/verify-mfa", { mfaToken, codigo });
}

/**
 * Solo debe llamarse cuando `login` respondió requiereMfa:true Y el
 * usuario todavía no tiene la verificación en dos pasos configurada
 * (o sea, la primera vez que un ADMINISTRADOR nuevo inicia sesión).
 * Devuelve { secret, otpauthUrl } para mostrar el QR.
 */
export async function iniciarConfiguracionMfa(mfaToken) {
  return apiClient.get("/auth/mfa-setup", { mfaToken });
}

/** Siempre responde igual, exista o no el correo (no confirmar existencia). */
export async function recuperarPassword(correo) {
  return apiClient.post("/auth/forgot-password", { correo });
}

export async function restablecerPassword(token, passwordNueva) {
  return apiClient.post("/auth/reset-password", { token, passwordNueva });
}

/**
 * Recupera la sesión activa al recargar la página (F5), a partir de la
 * cookie httpOnly que ya trae el navegador. Si no hay sesión (o venció),
 * el backend responde 401 — acá lo tratamos como "no hay sesión todavía"
 * en vez de dejar que se propague como error, porque en el arranque de
 * la app esto es la situación normal para cualquiera que no haya hecho
 * login, no una sesión que "expiró".
 */
export async function obtenerUsuarioActual() {
  try {
    return await apiClient.get("/auth/me");
  } catch {
    return null;
  }
}

export async function cambiarPassword(passwordActual, passwordNueva) {
  return apiClient.post("/auth/cambiar-password", { passwordActual, passwordNueva });
}

export async function logout() {
  try {
    await apiClient.post("/auth/logout");
  } catch {
    // Si falla, igual seguimos con el logout del lado del cliente
    // (redirigir al login) — no bloquear al usuario por esto.
  }
}
