// ============================================================
// Sesiones: un inicio de sesión en un dispositivo.
//
// Reglas (todas se aplican en el SERVIDOR, el frontend solo avisa):
//   - Inactividad: si pasan SESION_INACTIVIDAD_MIN (30) minutos sin que
//     el usuario haga nada (el frontend reporta clics/teclas/scroll/toques
//     con POST /api/auth/actividad), la sesión se cierra. Las peticiones
//     automáticas no cuentan como actividad.
//   - Duración máxima: a las SESION_MAXIMA_HORAS (12) del login se cierra
//     aunque haya actividad. El refresh token y su cookie vencen en esa
//     misma fecha absoluta: renovar NO la extiende.
//   - Rotación: cada renovación cambia el refresh token. Si llega uno ya
//     rotado (alguien lo copió), se cierra toda la sesión.
//   - Se revisa en CADA petición (requireAuth), no solo al renovar: cerrar
//     una sesión corta también su access token en el acto.
// ============================================================
import crypto from "node:crypto";
import { db } from "../lib/db.js";
import { ApiError, sesionExpirada, sesionTerminada } from "../lib/errors.js";
import { firmarAccessToken, firmarRefreshToken, verificarRefreshToken, sesionDeTokenAunqueVencido } from "../lib/jwt.js";
import { ponerCookiesDeSesion } from "../lib/cookies.js";
import { ipCliente, registrarEventoAuditoria } from "../lib/seguridad.js";

function numeroPositivo(valor, porDefecto) {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : porDefecto;
}

const MINUTO = 60_000;
export const INACTIVIDAD_MS = numeroPositivo(process.env.SESION_INACTIVIDAD_MIN, 30) * MINUTO;
export const MAXIMA_MS = numeroPositivo(process.env.SESION_MAXIMA_HORAS, 12) * 60 * MINUTO;
const ACCESS_MS = 15 * MINUTO;
// Dos pestañas pueden renovar a la vez con el mismo token: la segunda
// llega con uno recién rotado. Dentro de este margen no es un robo; se le
// responde que reintente (la otra pestaña ya dejó la cookie nueva).
const GRACIA_ROTACION_MS = 30_000;
// El frontend avisa 2 minutos antes del cierre por inactividad.
const AVISO_SEGUNDOS = 120;

// Motivos de cierre que también borran la suscripción push del
// dispositivo. Los vencimientos naturales (inactividad, 12 h) la
// conservan: si no, nadie recibiría avisos con la app cerrada, que es
// justamente para lo que sirven.
const MOTIVOS_QUE_BORRAN_PUSH = new Set([
  "cierre",
  "cierre_remoto",
  "cierre_todas",
  "cierre_admin",
  "reutilizacion",
  "password_cambiada",
  "password_restablecida",
  "usuario_desactivado",
]);

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/** null si la sesión sigue viva; si no, "inactividad" | "maxima" | "revocada". */
export function motivoVencida(sesion, ahora = Date.now()) {
  if (!sesion || sesion.revocadaEn) return "revocada";
  if (ahora >= sesion.expiraAbsolutaEn.getTime()) return "maxima";
  if (ahora - sesion.ultimaActividadEn.getTime() >= INACTIVIDAD_MS) return "inactividad";
  return null;
}

/** Lo que el frontend necesita para su cuenta regresiva (fechas del servidor). */
export function estadoSesion(sesion) {
  return {
    ahora: Date.now(),
    expiraInactividadEn: sesion.ultimaActividadEn.getTime() + INACTIVIDAD_MS,
    expiraAbsolutaEn: sesion.expiraAbsolutaEn.getTime(),
    inactividadMin: INACTIVIDAD_MS / MINUTO,
    avisoSegundos: AVISO_SEGUNDOS,
  };
}

// Firma un access token y un refresh token nuevos para la sesión, guarda
// el hash del refresh token (nunca el token) y deja ambas cookies.
async function emitirTokens(res, sesion) {
  const restanteMs = sesion.expiraAbsolutaEn.getTime() - Date.now();
  if (restanteMs <= 1000) throw sesionTerminada("maxima");
  const accessMs = Math.min(ACCESS_MS, restanteMs);
  const refreshToken = firmarRefreshToken(sesion.usuarioId, sesion.id, restanteMs / 1000);
  await db.refreshToken.create({
    data: {
      usuarioId: sesion.usuarioId,
      sesionId: sesion.id,
      tokenHash: hashToken(refreshToken),
      expiraEn: sesion.expiraAbsolutaEn,
    },
  });
  ponerCookiesDeSesion(res, {
    accessToken: firmarAccessToken(sesion.usuarioId, sesion.id, accessMs / 1000),
    accessMs,
    refreshToken,
    expiraAbsolutaEn: sesion.expiraAbsolutaEn,
  });
}

/** Después de la contraseña (y el MFA si corresponde): sesión nueva en este dispositivo. */
export async function iniciarSesion(req, res, usuarioId) {
  const ahora = new Date();
  const sesion = await db.sesion.create({
    data: {
      id: crypto.randomUUID(),
      usuarioId,
      creadoEn: ahora,
      ultimaActividadEn: ahora,
      expiraAbsolutaEn: new Date(ahora.getTime() + MAXIMA_MS),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 300) || null,
      ip: ipCliente(req) || null,
    },
  });
  await emitirTokens(res, sesion);
  return sesion;
}

/**
 * Cierra una sesión: revoca todos sus refresh tokens y, según el motivo,
 * borra la suscripción push de ese dispositivo. Idempotente.
 */
export async function cerrarSesion(sesionId, motivo) {
  const ahora = new Date();
  await db.$transaction([
    db.sesion.updateMany({ where: { id: sesionId, revocadaEn: null }, data: { revocadaEn: ahora, motivoCierre: motivo } }),
    db.refreshToken.updateMany({ where: { sesionId, revocadoEn: null }, data: { revocadoEn: ahora, motivoRevocacion: motivo } }),
    ...(MOTIVOS_QUE_BORRAN_PUSH.has(motivo) ? [db.pushSubscription.deleteMany({ where: { sesionId } })] : []),
  ]);
}

/**
 * Cierra TODAS las sesiones de un usuario (menos `exceptoSesionId`, si se
 * indica) y borra las suscripciones push de esos dispositivos. Para
 * "cerrar sesión en todos los dispositivos", cambio o restablecimiento de
 * contraseña y desactivación.
 */
export async function cerrarTodasLasSesiones(usuarioId, motivo, { exceptoSesionId = null } = {}) {
  const ahora = new Date();
  const otra = exceptoSesionId ? { NOT: { sesionId: exceptoSesionId } } : {};
  const [sesiones] = await db.$transaction([
    db.sesion.updateMany({
      where: { usuarioId, revocadaEn: null, ...(exceptoSesionId ? { NOT: { id: exceptoSesionId } } : {}) },
      data: { revocadaEn: ahora, motivoCierre: motivo },
    }),
    // Incluye los tokens de antes de esta versión (sin sesión).
    db.refreshToken.updateMany({
      where: { usuarioId, revocadoEn: null, ...(exceptoSesionId ? { OR: [{ sesionId: null }, otra] } : {}) },
      data: { revocadoEn: ahora, motivoRevocacion: motivo },
    }),
    // Las suscripciones de esos dispositivos; con exceptoSesionId se
    // conserva solo la del dispositivo actual.
    db.pushSubscription.deleteMany({
      where: { usuarioId, ...(exceptoSesionId ? { OR: [{ sesionId: null }, otra] } : {}) },
    }),
  ]);
  if (sesiones.count > 0) registrarEventoAuditoria({ evento: "sesiones_cerradas", usuarioId, motivo, cantidad: sesiones.count });
  return sesiones.count;
}

/**
 * Valida la sesión de un access token (requireAuth). Si venció por
 * inactividad o por la duración máxima, la deja cerrada en la base (así
 * el refresh token tampoco sirve) y lanza el error con el motivo.
 */
export async function sesionActiva(sesionId) {
  if (!sesionId) throw sesionExpirada(); // token de antes de esta versión
  const sesion = await db.sesion.findUnique({ where: { id: sesionId } });
  const motivo = motivoVencida(sesion);
  if (motivo) {
    if (sesion && !sesion.revocadaEn) await cerrarSesion(sesion.id, motivo);
    throw sesionTerminada(motivo);
  }
  return sesion;
}

/** El usuario hizo algo (clic, tecla, scroll, toque): mueve el plazo de inactividad. */
export async function registrarActividad(sesion) {
  return db.sesion.update({ where: { id: sesion.id }, data: { ultimaActividadEn: new Date() } });
}

/**
 * Renueva el access token con el refresh token de la cookie. NO cuenta
 * como actividad ni extiende la fecha máxima. Devuelve la sesión.
 */
export async function renovar(req, res, tokenCrudo, { usuarioActivo }) {
  let payload;
  try {
    payload = verificarRefreshToken(tokenCrudo);
  } catch {
    // Si la firma es buena pero venció, es porque la sesión llegó a su máximo.
    const vencido = sesionDeTokenAunqueVencido(tokenCrudo, "refresh");
    throw vencido?.sid ? sesionTerminada("maxima") : sesionExpirada();
  }
  if (!payload.sid) throw sesionExpirada(); // token de antes de esta versión

  const registro = await db.refreshToken.findUnique({ where: { tokenHash: hashToken(tokenCrudo) }, include: { sesion: true } });
  if (!registro || registro.sesionId !== payload.sid || !registro.sesion) throw sesionExpirada();
  const { sesion } = registro;

  if (registro.revocadoEn) {
    if (registro.motivoRevocacion === "rotado" && !sesion.revocadaEn) {
      if (Date.now() - registro.revocadoEn.getTime() <= GRACIA_ROTACION_MS) {
        throw new ApiError(409, "RENOVACION_CONCURRENTE", "La sesión se acaba de renovar en otra pestaña.");
      }
      // Un token ya cambiado volvió a aparecer: alguien tiene una copia.
      // Se cierra la sesión completa (el ladrón y el dueño); el dueño
      // vuelve a iniciar sesión con su contraseña, el ladrón no puede.
      await cerrarSesion(sesion.id, "reutilizacion");
      registrarEventoAuditoria({ evento: "refresh_reutilizado", usuarioId: sesion.usuarioId, sesionId: sesion.id, ip: ipCliente(req) });
    }
    throw sesionTerminada(sesion.revocadaEn && sesion.motivoCierre === "inactividad" ? "inactividad" : "revocada");
  }

  const motivo = motivoVencida(sesion);
  if (motivo) {
    await cerrarSesion(sesion.id, motivo);
    throw sesionTerminada(motivo);
  }
  if (!(await usuarioActivo(sesion.usuarioId))) {
    await cerrarSesion(sesion.id, "usuario_desactivado");
    throw sesionTerminada("revocada");
  }

  // Marca el token como rotado SOLO si nadie lo hizo ya (dos pedidos a la vez).
  const { count } = await db.refreshToken.updateMany({
    where: { id: registro.id, revocadoEn: null },
    data: { revocadoEn: new Date(), motivoRevocacion: "rotado" },
  });
  if (count !== 1) throw new ApiError(409, "RENOVACION_CONCURRENTE", "La sesión se acaba de renovar en otra pestaña.");

  await emitirTokens(res, sesion);
  return sesion;
}

/** Sesión a la que pertenecen las cookies de este pedido (aunque estén vencidas). */
export function sesionIdDeCookies(refreshToken, accessToken) {
  return (
    sesionDeTokenAunqueVencido(refreshToken, "refresh")?.sid ?? sesionDeTokenAunqueVencido(accessToken, "access")?.sid ?? null
  );
}

// "Chrome en Android", "Safari en iPhone"... para la lista de dispositivos.
export function describirDispositivo(userAgent) {
  const ua = userAgent || "";
  const navegador =
    (/Edg(A|iOS)?\//.test(ua) && "Edge") ||
    (/OPR\/|Opera/.test(ua) && "Opera") ||
    (/SamsungBrowser/.test(ua) && "Samsung Internet") ||
    (/Firefox\/|FxiOS/.test(ua) && "Firefox") ||
    (/Chrome\/|CriOS/.test(ua) && "Chrome") ||
    (/Safari\//.test(ua) && "Safari") ||
    "Navegador";
  const sistema =
    (/Android/.test(ua) && "Android") ||
    (/iPhone/.test(ua) && "iPhone") ||
    (/iPad/.test(ua) && "iPad") ||
    (/Windows/.test(ua) && "Windows") ||
    (/Mac OS X|Macintosh/.test(ua) && "Mac") ||
    (/CrOS/.test(ua) && "ChromeOS") ||
    (/Linux/.test(ua) && "Linux") ||
    "otro sistema";
  return `${navegador} en ${sistema}`;
}

/** Sesiones vigentes de un usuario, la más reciente primero. */
export async function listarSesiones(usuarioId, sesionActualId) {
  const sesiones = await db.sesion.findMany({
    where: { usuarioId, revocadaEn: null, expiraAbsolutaEn: { gt: new Date() } },
    orderBy: { ultimaActividadEn: "desc" },
  });
  return sesiones
    .filter((s) => !motivoVencida(s))
    .map((s) => ({
      id: s.id,
      dispositivo: describirDispositivo(s.userAgent),
      ip: s.ip,
      iniciadaEn: s.creadoEn,
      ultimaActividadEn: s.ultimaActividadEn,
      expiraEn: s.expiraAbsolutaEn,
      esActual: s.id === sesionActualId,
    }));
}

/** Cierra una sesión del propio usuario (desde su lista de dispositivos). */
export async function cerrarSesionPropia(usuarioId, sesionId) {
  const sesion = await db.sesion.findUnique({ where: { id: sesionId } });
  if (!sesion || sesion.usuarioId !== usuarioId) throw new ApiError(404, "NO_ENCONTRADO", "Esa sesión no existe.");
  await cerrarSesion(sesionId, "cierre_remoto");
}

/**
 * Mantenimiento (cada hora): marca como cerradas las sesiones vencidas,
 * borra las de hace más de 30 días (con sus tokens) y los refresh tokens
 * de antes de esta versión, que ya no sirven.
 */
export async function limpiarSesiones() {
  const ahora = Date.now();
  const vigentes = await db.sesion.findMany({ where: { revocadaEn: null } });
  for (const s of vigentes) {
    const motivo = motivoVencida(s, ahora);
    if (motivo) await cerrarSesion(s.id, motivo);
  }
  const hace30Dias = new Date(ahora - 30 * 24 * 60 * MINUTO);
  await db.sesion.deleteMany({ where: { expiraAbsolutaEn: { lt: hace30Dias } } });
  await db.refreshToken.deleteMany({ where: { sesionId: null } });
}
