import * as authService from "../services/auth.service.js";
import * as sesiones from "../services/sesiones.service.js";
import { serializarUsuario, buscarPorId } from "../services/usuario.service.js";
import { NOMBRE_COOKIE_ACCESS, NOMBRE_COOKIE_REFRESH, borrarCookiesDeSesion } from "../lib/cookies.js";
import { asyncHandler, noAutenticado, validacionFallida } from "../lib/errors.js";
import { db } from "../lib/db.js";

// Deja al usuario con sesión iniciada en este dispositivo: crea la
// sesión, firma ambos tokens y los manda como cookies httpOnly — el
// frontend nunca ve el token en sí, así que un XSS no puede robarlo con
// `document.cookie` ni con localStorage. Devuelve las fechas de la sesión
// para la cuenta regresiva del frontend.
async function iniciarSesion(req, res, usuarioId) {
  const sesion = await sesiones.iniciarSesion(req, res, usuarioId);
  return sesiones.estadoSesion(sesion);
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

  const sesion = await iniciarSesion(req, res, resultado.usuario.id);
  res.json({ requiereMfa: false, usuario: resultado.usuario, sesion });
});

export const postVerifyMfa = asyncHandler(async (req, res) => {
  const { mfaToken, codigo } = req.body;
  const { usuario: usuarioActualizado } = await authService.verificarMfa(mfaToken, codigo);
  const sesion = await iniciarSesion(req, res, usuarioActualizado.id);
  res.json({ usuario: usuarioActualizado, sesion });
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
  const resultado = await authService.cambiarPassword(req.usuario.id, passwordActual, passwordNueva, req.sesion.id);
  res.json(resultado);
});

export const getMe = asyncHandler(async (req, res) => {
  // req.usuario ya lo cargó requireAuth, pero acá no viene con las
  // relaciones de empresas incluidas — se vuelve a pedir completo.
  const usuarioCompleto = await buscarPorId(req.usuario.id);
  res.json(serializarUsuario(usuarioCompleto));
});

// Renueva el access token (15 min) con el refresh token, que vive en una
// cookie separada restringida a /api/auth. Cada renovación rota el
// refresh token; NO cuenta como actividad ni alarga la sesión: si pasaron
// 30 min sin actividad o se llegó a las 12 h, responde 401 con el motivo.
// Ver services/sesiones.service.js.
export const postRefresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[NOMBRE_COOKIE_REFRESH];
  if (!token) throw noAutenticado();
  try {
    const sesion = await sesiones.renovar(req, res, token, {
      usuarioActivo: async (id) => !!(await db.usuario.findUnique({ where: { id }, select: { activo: true } }))?.activo,
    });
    res.json({ ok: true, sesion: sesiones.estadoSesion(sesion) });
  } catch (err) {
    // 409 = otra pestaña ya renovó: sus cookies nuevas sirven, no se borran.
    if (err.status === 401) borrarCookiesDeSesion(res);
    throw err;
  }
});

// Cierra la sesión de ESTE dispositivo en el servidor (no solo borra las
// cookies): sus refresh tokens dejan de servir y, si el usuario cerró a
// propósito, se borra la suscripción push de este dispositivo.
// motivo "inactividad" / "maxima": el cierre automático del frontend; ahí
// se conserva la suscripción para seguir recibiendo avisos de vencimientos.
// Funciona aunque el access token haya vencido (identifica la sesión por
// la firma de cualquiera de las dos cookies).
export const postLogout = asyncHandler(async (req, res) => {
  const { motivo, pushEndpoint } = req.body || {};
  const automatico = motivo === "inactividad" || motivo === "maxima";
  const sesionId = sesiones.sesionIdDeCookies(req.cookies?.[NOMBRE_COOKIE_REFRESH], req.cookies?.[NOMBRE_COOKIE_ACCESS]);
  if (sesionId) {
    const sesion = await db.sesion.findUnique({ where: { id: sesionId } });
    if (sesion) {
      await sesiones.cerrarSesion(sesionId, automatico ? motivo : "cierre");
      if (pushEndpoint && !automatico) {
        await db.pushSubscription.deleteMany({ where: { endpoint: pushEndpoint, usuarioId: sesion.usuarioId } });
      }
    }
  }
  borrarCookiesDeSesion(res);
  res.json({ ok: true });
});

// El usuario hizo algo en la pantalla (el frontend lo reporta como mucho
// cada 30 s mientras haya clics, teclas, scroll o toques).
export const postActividad = asyncHandler(async (req, res) => {
  const sesion = await sesiones.registrarActividad(req.sesion);
  res.json({ sesion: sesiones.estadoSesion(sesion) });
});

// Fechas de la sesión actual, sin contarlo como actividad (al recargar).
export const getSesion = asyncHandler(async (req, res) => {
  res.json({ sesion: sesiones.estadoSesion(req.sesion) });
});

export const getSesiones = asyncHandler(async (req, res) => {
  res.json(await sesiones.listarSesiones(req.usuario.id, req.sesion.id));
});

export const deleteSesion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw validacionFallida("Identificador de sesión inválido.");
  await sesiones.cerrarSesionPropia(req.usuario.id, id);
  if (id === req.sesion.id) borrarCookiesDeSesion(res);
  res.json({ ok: true, eraActual: id === req.sesion.id });
});

// "Cerrar sesión en todos los dispositivos" (incluido este).
export const postCerrarTodas = asyncHandler(async (req, res) => {
  const cerradas = await sesiones.cerrarTodasLasSesiones(req.usuario.id, "cierre_todas");
  borrarCookiesDeSesion(res);
  res.json({ ok: true, cerradas });
});
