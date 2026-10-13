import bcrypt from "bcrypt";
import crypto from "node:crypto";
import * as OTPAuth from "otpauth";
import { db } from "../lib/db.js";
import { buscarPorNombreUsuario, buscarPorCorreo, buscarPorId, serializarUsuario } from "./usuario.service.js";
import { requiereMfaPorPolitica } from "../lib/roles.js";
import { credencialesInvalidas, validacionFallida, ApiError } from "../lib/errors.js";
import { enviarCorreoRecuperacion } from "./email.service.js";
import { firmarMfaPendingToken, verificarMfaPendingToken } from "../lib/jwt.js";
import { cerrarTodasLasSesiones } from "./sesiones.service.js";

const RONDAS_BCRYPT = 12;

// Hash de una contraseña que nadie conoce, con el mismo costo que los
// reales: si el usuario no existe se compara igual contra este, para que
// la respuesta tarde lo mismo. Antes, "no existe" respondía en ~5 ms y
// "contraseña incorrecta" en ~500 ms: se podía averiguar qué usuarios
// existen midiendo el tiempo.
const HASH_SEÑUELO = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), RONDAS_BCRYPT);

// Último paso de 30 s aceptado por usuario: un código TOTP solo sirve UNA
// vez (antes el mismo código valía varias veces durante ~90 s). Vive en
// memoria: un reinicio lo borra, y en ese caso a lo sumo ese mismo
// código vale una vez más dentro de su ventana.
const ultimoPasoMfa = new Map();
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
  // Se compara SIEMPRE (contra el señuelo si el usuario no existe), así
  // "no existe" y "contraseña incorrecta" tardan lo mismo.
  const claveValida = await bcrypt.compare(clave, usuario?.passwordHash ?? HASH_SEÑUELO);
  if (!usuario || !claveValida) throw credencialesInvalidas();

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
  const paso = Math.floor(Date.now() / 30_000) + delta;
  if (paso <= (ultimoPasoMfa.get(usuario.id) ?? -1)) {
    throw new ApiError(401, "CODIGO_USADO", "Ese código ya se usó. Espera el siguiente código de tu app.");
  }
  ultimoPasoMfa.set(usuario.id, paso);

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
    // Sin esperar al correo: si se esperara, la respuesta tardaría más
    // cuando el correo existe y se podría averiguar quién está registrado.
    enviarCorreoRecuperacion(usuario.correo, usuario.nombre, linkRecuperacion).catch((err) =>
      console.error("No se pudo enviar el correo de recuperación:", err.message)
    );
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
  await db.$transaction(async (tx) => {
    // Marcar como usado SOLO si nadie lo usó ya: dos pedidos simultáneos
    // con el mismo enlace ya no pueden pasar los dos.
    const { count } = await tx.passwordResetToken.updateMany({
      where: { id: registro.id, usadoEn: null },
      data: { usadoEn: new Date() },
    });
    if (count !== 1) throw validacionFallida("El enlace es inválido o ya venció. Solicita uno nuevo.");
    await tx.usuario.update({ where: { id: registro.usuarioId }, data: { passwordHash } });
    // Cualquier otro enlace pendiente del mismo usuario deja de servir.
    await tx.passwordResetToken.updateMany({
      where: { usuarioId: registro.usuarioId, usadoEn: null },
      data: { usadoEn: new Date() },
    });
  });
  // Si alguien restableció la contraseña es porque probablemente la
  // anterior estaba comprometida — todas las sesiones abiertas (y sus
  // suscripciones push) se cortan acá, no esperan a vencer solas.
  await cerrarTodasLasSesiones(registro.usuarioId, "password_restablecida");
  return { ok: true };
}

export async function cambiarPassword(usuarioId, passwordActual, passwordNueva, sesionActualId) {
  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  const claveValida = await bcrypt.compare(passwordActual, usuario.passwordHash);
  if (!claveValida) {
    throw validacionFallida("La contraseña actual no es correcta.");
  }
  const passwordHash = await bcrypt.hash(passwordNueva, RONDAS_BCRYPT);
  await db.usuario.update({ where: { id: usuarioId }, data: { passwordHash } });
  // Cierra todas las demás sesiones (otros dispositivos que entraron con
  // la contraseña anterior) en el acto. La de este dispositivo sigue: es
  // quien acaba de demostrar la contraseña actual.
  await cerrarTodasLasSesiones(usuarioId, "password_cambiada", { exceptoSesionId: sesionActualId });
  return { ok: true };
}
