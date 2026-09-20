import bcrypt from "bcrypt";
import crypto from "node:crypto";
import * as OTPAuth from "otpauth";
import { db } from "../lib/db.js";
import { buscarPorNombreUsuario, buscarPorCorreo, buscarPorId, serializarUsuario } from "./usuario.service.js";
import { requiereMfaPorPolitica } from "../lib/roles.js";
import { credencialesInvalidas, validacionFallida, ApiError } from "../lib/errors.js";
import { enviarCorreoRecuperacion } from "./email.service.js";
import { firmarMfaPendingToken, verificarMfaPendingToken } from "../lib/jwt.js";
import { revocarTodosLosRefreshTokens } from "./refreshTokens.service.js";

const RONDAS_BCRYPT = 12;
const EMISOR_TOTP = "Activo360";

function crearTotp(secretBase32, etiqueta) {
  return new OTPAuth.TOTP({
    issuer: EMISOR_TOTP,
    label: etiqueta,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

// El mfaToken prueba que ya se pasó por el paso 1 (contraseña
// correcta) — sin esto, cualquiera que supiera un nombre de usuario
// podía pedir el secreto MFA de otra persona sin haber demostrado la
// contraseña. Dura 5 minutos, tiempo de sobra para escanear el QR y
// meter el código.
function usuarioIdDesdeMfaToken(mfaToken) {
  try {
    return verificarMfaPendingToken(mfaToken).sub;
  } catch {
    throw new ApiError(401, "MFA_TOKEN_INVALIDO", "Tu sesión de verificación venció. Vuelve a iniciar sesión.");
  }
}

// ---- Paso 1: usuario + contraseña ----
// El correo NUNCA sirve para loguearse — solo el nombre de usuario. El
// correo se guarda para un único propósito: "olvidé mi contraseña".
export async function login(nombreUsuario, clave) {
  const usuario = await buscarPorNombreUsuario(nombreUsuario);
  if (!usuario) throw credencialesInvalidas();

  const claveValida = await bcrypt.compare(clave, usuario.passwordHash);
  if (!claveValida) throw credencialesInvalidas();

  // Sin esto, alguien desactivado podía completar el paso 1 (contraseña
  // correcta) y quedarse con un mfaToken válido por 5 minutos — incluso
  // si nunca iba a poder usarlo para nada, no debería ni llegar a
  // recibirlo.
  if (!usuario.activo) throw credencialesInvalidas();

  if (requiereMfaPorPolitica(usuario)) {
    return {
      requiereMfa: true,
      usuario: usuario.usuario,
      mfaConfigurado: usuario.mfaHabilitado,
      mfaToken: firmarMfaPendingToken(usuario.id),
    };
  }

  return { requiereMfa: false, usuario: serializarUsuario(usuario) };
}

// Antes de mostrar el QR para activar MFA, genera (o reutiliza) el
// secreto del usuario. Se llama desde GET /api/auth/mfa-setup, que el
// frontend debe pedir cuando login() responde requiereMfa:true pero el
// usuario todavía no tiene MFA activado. Requiere el mfaToken del
// paso 1 — nunca un nombre de usuario suelto.
export async function iniciarConfiguracionMfa(mfaToken) {
  const usuarioId = usuarioIdDesdeMfaToken(mfaToken);
  const usuario = await buscarPorId(usuarioId);
  if (!usuario) throw credencialesInvalidas();
  if (!usuario.activo) throw credencialesInvalidas();
  if (!requiereMfaPorPolitica(usuario)) {
    throw validacionFallida("Este usuario no requiere verificación en dos pasos.");
  }
  if (usuario.mfaHabilitado) {
    throw validacionFallida("La verificación en dos pasos ya está activada para este usuario.");
  }

  // Reutiliza el secreto si ya se había generado uno en un intento
  // anterior (evita invalidar un QR que el usuario ya escaneó pero
  // todavía no confirmó con un código).
  const secreto = usuario.mfaSecret || new OTPAuth.Secret({ size: 20 }).base32;
  if (!usuario.mfaSecret) {
    await db.usuario.update({ where: { id: usuario.id }, data: { mfaSecret: secreto } });
  }

  const totp = crearTotp(secreto, usuario.usuario);
  return { secret: secreto, otpauthUrl: totp.toString() };
}

// ---- Paso 2: código de 6 dígitos ----
// Si el usuario todavía no tenía MFA activado, este es también el paso
// que lo activa (el primer código correcto después de escanear el QR
// confirma que lo guardó bien). También requiere el mfaToken del paso 1.
export async function verificarMfa(mfaToken, codigo) {
  const usuarioId = usuarioIdDesdeMfaToken(mfaToken);
  const usuario = await buscarPorId(usuarioId);
  if (!usuario) throw credencialesInvalidas();
  // Cubre el caso donde a alguien lo desactivan justo entre el paso 1
  // (contraseña correcta, ya tiene el mfaToken) y el paso 2 (código) —
  // sin esto, esos pocos minutos de ventana igual le dejaban crear
  // una sesión válida.
  if (!usuario.activo) throw credencialesInvalidas();
  if (!usuario.mfaSecret) {
    throw validacionFallida("Todavía no configuraste la verificación en dos pasos.");
  }

  const totp = crearTotp(usuario.mfaSecret, usuario.usuario);
  // window:1 tolera que el reloj del celular esté hasta 30s desfasado
  // del servidor — sin esto, un usuario con la hora mal puesta nunca
  // podría entrar, y el bug parecería "el código no funciona".
  const delta = totp.validate({ token: codigo, window: 1 });
  if (delta === null) {
    throw new ApiError(401, "CODIGO_INVALIDO", "Código incorrecto o vencido.");
  }

  if (!usuario.mfaHabilitado) {
    await db.usuario.update({ where: { id: usuario.id }, data: { mfaHabilitado: true } });
  }

  const usuarioActualizado = await buscarPorId(usuario.id);
  return { usuario: serializarUsuario(usuarioActualizado) };
}

// ---- Recuperar contraseña (por correo — el único uso que tiene) ----
// Responde siempre igual exista o no el correo — si no, cualquiera
// podría usar este endpoint para averiguar qué correos están
// registrados en el sistema (enumeración de usuarios).
export async function solicitarRecuperacion(correo) {
  const usuario = await buscarPorCorreo(correo);
  if (usuario) {
    const tokenCrudo = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(tokenCrudo).digest("hex");
    await db.passwordResetToken.create({
      data: {
        usuarioId: usuario.id,
        tokenHash,
        expiraEn: new Date(Date.now() + 30 * 60 * 1000), // 30 min
      },
    });

    const linkRecuperacion = `${process.env.FRONTEND_URL}/restablecer-password?token=${tokenCrudo}`;
    await enviarCorreoRecuperacion(usuario.correo, usuario.nombre, linkRecuperacion);
  }
  return { ok: true };
}

export async function restablecerPassword(tokenCrudo, passwordNueva) {
  const tokenHash = crypto.createHash("sha256").update(tokenCrudo).digest("hex");
  const registro = await db.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!registro || registro.usadoEn || registro.expiraEn < new Date()) {
    throw validacionFallida("El enlace es inválido o ya venció. Solicita uno nuevo.");
  }

  const passwordHash = await bcrypt.hash(passwordNueva, RONDAS_BCRYPT);
  await db.$transaction([
    db.usuario.update({ where: { id: registro.usuarioId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: registro.id }, data: { usadoEn: new Date() } }),
  ]);
  // Si alguien restableció la contraseña es porque probablemente la
  // anterior estaba comprometida — cualquier sesión que siguiera activa
  // con la contraseña vieja se corta acá, no espera a que expire sola.
  await revocarTodosLosRefreshTokens(registro.usuarioId);
  return { ok: true };
}

export async function cambiarPassword(usuarioId, passwordActual, passwordNueva) {
  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  const claveValida = await bcrypt.compare(passwordActual, usuario.passwordHash);
  if (!claveValida) {
    throw validacionFallida("La contraseña actual no es correcta.");
  }
  const passwordHash = await bcrypt.hash(passwordNueva, RONDAS_BCRYPT);
  await db.usuario.update({ where: { id: usuarioId }, data: { passwordHash } });
  // Cierra cualquier otra sesión que haya quedado abierta en otro
  // dispositivo con la contraseña anterior — esta sesión actual sigue
  // funcionando hasta que su access token expire solo (máx. 15 min).
  await revocarTodosLosRefreshTokens(usuarioId);
  return { ok: true };
}
