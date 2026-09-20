import * as authService from "../services/auth.service.js";
import * as refreshTokensService from "../services/refreshTokens.service.js";
import { serializarUsuario, buscarPorId } from "../services/usuario.service.js";
import { firmarAccessToken, firmarRefreshToken, verificarRefreshToken } from "../lib/jwt.js";
import {
  OPCIONES_COOKIE_ACCESS,
  OPCIONES_COOKIE_REFRESH,
  NOMBRE_COOKIE_ACCESS,
  NOMBRE_COOKIE_REFRESH,
} from "../lib/cookies.js";
import { asyncHandler, noAutenticado, sesionExpirada } from "../lib/errors.js";

// Deja al usuario con sesión iniciada: firma ambos tokens, registra el
// refresh token en la base de datos (para poder revocarlo después si
// hace falta — ver refreshTokens.service.js) y los manda como cookies
// httpOnly — el frontend nunca ve el token en sí, así que un XSS no
// puede robarlo con `document.cookie` ni con localStorage.
async function iniciarSesion(res, usuarioId) {
  const refreshToken = firmarRefreshToken(usuarioId);
  await refreshTokensService.registrarRefreshToken(usuarioId, refreshToken);

  res.cookie(NOMBRE_COOKIE_ACCESS, firmarAccessToken(usuarioId), OPCIONES_COOKIE_ACCESS);
  res.cookie(NOMBRE_COOKIE_REFRESH, refreshToken, OPCIONES_COOKIE_REFRESH);
}

export const postLogin = asyncHandler(async (req, res) => {
  const { usuario, clave } = req.body;
  const resultado = await authService.login(usuario, clave);

  if (resultado.requiereMfa) {
    return res.json({
      requiereMfa: true,
      usuario: resultado.usuario,
      mfaConfigurado: resultado.mfaConfigurado,
      mfaToken: resultado.mfaToken,
    });
  }

  await iniciarSesion(res, resultado.usuario.id);
  res.json({ requiereMfa: false, usuario: resultado.usuario });
});

export const postVerifyMfa = asyncHandler(async (req, res) => {
  const { mfaToken, codigo } = req.body;
  const { usuario: usuarioActualizado } = await authService.verificarMfa(mfaToken, codigo);
  await iniciarSesion(res, usuarioActualizado.id);
  res.json({ usuario: usuarioActualizado });
});

// El frontend debe llamar a esto cuando login() devuelve requiereMfa:true
// y el usuario todavía no tiene MFA configurado (para mostrarle el QR
// antes de pedirle el primer código). Exige el mfaToken que login()
// entregó — nunca un nombre de usuario suelto, que cualquiera podría
// mandar sin haber demostrado la contraseña.
export const getMfaSetup = asyncHandler(async (req, res) => {
  const { mfaToken } = req.query;
  const datos = await authService.iniciarConfiguracionMfa(mfaToken);
  res.json(datos);
});

export const postForgotPassword = asyncHandler(async (req, res) => {
  const { correo } = req.body;
  const resultado = await authService.solicitarRecuperacion(correo);
  res.json(resultado);
});

export const postResetPassword = asyncHandler(async (req, res) => {
  const { token, passwordNueva } = req.body;
  const resultado = await authService.restablecerPassword(token, passwordNueva);
  res.json(resultado);
});

export const postCambiarPassword = asyncHandler(async (req, res) => {
  const { passwordActual, passwordNueva } = req.body;
  const resultado = await authService.cambiarPassword(req.usuario.id, passwordActual, passwordNueva);
  res.json(resultado);
});

export const getMe = asyncHandler(async (req, res) => {
  // req.usuario ya lo cargó requireAuth, pero acá no viene con las
  // relaciones de empresas incluidas — se vuelve a pedir completo.
  const usuarioCompleto = await buscarPorId(req.usuario.id);
  res.json(serializarUsuario(usuarioCompleto));
});

// El access token dura poco a propósito (15 min) — este endpoint es el
// que permite renovarlo sin que el usuario tenga que volver a loguearse,
// usando el refresh token (que vive en una cookie separada, restringida
// a /api/auth) mientras siga siendo válido Y no haya sido revocado
// (logout, cambio de contraseña, o que un Administrador haya
// desactivado la cuenta cierran esa puerta de inmediato, no hay que
// esperar a que el token expire solo).
//
// Además, cada renovación "rota" el refresh token: se revoca el que
// llegó y se entrega uno nuevo — así, si alguien alguna vez roba un
// refresh token viejo, ya no le sirve de nada.
export const postRefresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[NOMBRE_COOKIE_REFRESH];
  if (!token) throw noAutenticado();

  let payload;
  try {
    payload = verificarRefreshToken(token);
  } catch {
    throw sesionExpirada();
  }

  const registro = await refreshTokensService.refreshTokenValido(token);
  if (!registro) throw sesionExpirada();

  // Sin esto, alguien recién desactivado por un Administrador podría
  // seguir renovando su sesión indefinidamente mientras su refresh
  // token no haya expirado — requireAuth revisa "activo" en cada
  // pedido normal, pero acá se estaba emitiendo el access token nuevo
  // sin pasar por ese mismo chequeo.
  const usuario = await buscarPorId(payload.sub);
  if (!usuario || !usuario.activo) {
    await refreshTokensService.revocarRefreshToken(token);
    throw sesionExpirada();
  }

  await refreshTokensService.revocarRefreshToken(token);
  await iniciarSesion(res, payload.sub);
  res.json({ ok: true });
});

export const postLogout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[NOMBRE_COOKIE_REFRESH];
  if (token) await refreshTokensService.revocarRefreshToken(token);

  res.clearCookie(NOMBRE_COOKIE_ACCESS, OPCIONES_COOKIE_ACCESS);
  res.clearCookie(NOMBRE_COOKIE_REFRESH, OPCIONES_COOKIE_REFRESH);
  res.json({ ok: true });
});
