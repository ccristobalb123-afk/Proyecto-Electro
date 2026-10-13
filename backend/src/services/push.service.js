import webpush from "web-push";
import { db } from "../lib/db.js";

const VAPID_CONFIGURADO = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (VAPID_CONFIGURADO) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export function vapidConfigurado() {
  return VAPID_CONFIGURADO;
}

// sesionId: la sesión del dispositivo que se suscribe (al cerrar o
// revocar esa sesión se borra la suscripción). El frontend vuelve a
// mandarla después de cada inicio de sesión para actualizar el vínculo.
export async function guardarSuscripcion(usuarioId, suscripcion, sesionId) {
  await db.pushSubscription.upsert({
    where: { endpoint: suscripcion.endpoint },
    update: { usuarioId, sesionId, p256dh: suscripcion.keys.p256dh, auth: suscripcion.keys.auth },
    create: {
      usuarioId,
      sesionId,
      endpoint: suscripcion.endpoint,
      p256dh: suscripcion.keys.p256dh,
      auth: suscripcion.keys.auth,
    },
  });
}

// Solo la del propio usuario (antes se podía borrar la de cualquiera
// conociendo su endpoint).
export async function eliminarSuscripcion(usuarioId, endpoint) {
  await db.pushSubscription.deleteMany({ where: { endpoint, usuarioId } });
}

// Manda la notificación a TODOS los dispositivos suscritos de un
// usuario (puede tener el celular y la compu, por ejemplo).
export async function enviarAUsuario(usuarioId, payload) {
  if (!VAPID_CONFIGURADO) {
    console.log(`[push NO enviado — VAPID no configurado, ver .env.example] Para usuario ${usuarioId}:`, payload);
    return;
  }

  const suscripciones = await db.pushSubscription.findMany({ where: { usuarioId } });
  for (const sub of suscripciones) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err) {
      // 404/410 = el navegador invalidó esa suscripción (el usuario
      // desinstaló, limpió datos del sitio, etc.) — no es un error real,
      // solo hay que dejar de intentar mandarle a esa suscripción muerta.
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      } else {
        console.error("Error enviando push:", err.message);
      }
    }
  }
}

// Los avisos de vencimiento van a quienes realmente pueden hacer algo
// al respecto — cualquier rol (SuperAdmin, o uno personalizado) que
// tenga acceso al módulo correspondiente (RRHH para contratos/cursos,
// Operaciones para vehículos/equipos) Y a la empresa dueña del
// registro que está por vencer. Antes esto dependía de 2 nombres de
// rol fijos (ADMINISTRADOR/SUPERVISOR) que ya no existen — ahora los
// roles son configurables, así que lo único que importa es si el rol
// puede ver ese módulo, sin importar cómo se llame.
export async function enviarAUsuariosConAcceso({ modulo, empresas }, payload) {
  const usuarios = await db.usuario.findMany({
    where: {
      activo: true,
      empresas: { some: { empresa: { slug: { in: empresas } } } },
      OR: [{ esSuperAdmin: true }, { modulos: { some: { modulo } } }],
    },
  });
  for (const usuario of usuarios) {
    await enviarAUsuario(usuario.id, payload);
  }
}
