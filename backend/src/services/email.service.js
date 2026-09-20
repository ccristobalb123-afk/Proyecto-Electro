import nodemailer from "nodemailer";

// Si no hay SMTP configurado en el .env, los correos se loguean en la
// consola en vez de fallar — así el desarrollo local sigue funcionando
// sin necesitar credenciales reales todavía, pero en cuanto se
// completan las variables SMTP_*, empieza a mandar correos de verdad
// sin tocar ni una línea de código.
const SMTP_CONFIGURADO = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transportador = null;
function obtenerTransportador() {
  if (!SMTP_CONFIGURADO) return null;
  if (!transportador) {
    transportador = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === "465",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transportador;
}

async function enviarCorreo({ para, asunto, textoPlano, html }) {
  const transporte = obtenerTransportador();
  if (!transporte) {
    console.log(`\n[correo NO enviado — SMTP no configurado, ver .env.example]`);
    console.log(`Para: ${para}`);
    console.log(`Asunto: ${asunto}`);
    console.log(textoPlano);
    console.log("");
    return;
  }

  await transporte.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: para,
    subject: asunto,
    text: textoPlano,
    html,
  });
}

export async function enviarCorreoRecuperacion(correo, nombre, link) {
  await enviarCorreo({
    para: correo,
    asunto: "Recupera tu contraseña — Activo360",
    textoPlano: `Hola ${nombre},\n\nRecibimos una solicitud para restablecer tu contraseña. Este enlace vence en 30 minutos:\n${link}\n\nSi no fuiste tú, ignora este correo — tu contraseña sigue igual.`,
    html: `
      <p>Hola ${nombre},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Este enlace vence en 30 minutos:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Si no fuiste tú, ignora este correo — tu contraseña sigue igual.</p>
    `,
  });
}

export async function enviarCorreoPasswordTemporal(correo, nombre, passwordTemporal) {
  await enviarCorreo({
    para: correo,
    asunto: "Tu acceso a Activo360",
    textoPlano: `Hola ${nombre},\n\nTu contraseña temporal es: ${passwordTemporal}\n\nTe recomendamos cambiarla apenas inicies sesión.`,
    html: `
      <p>Hola ${nombre},</p>
      <p>Tu contraseña temporal es: <b>${passwordTemporal}</b></p>
      <p>Te recomendamos cambiarla apenas inicies sesión.</p>
    `,
  });
}
