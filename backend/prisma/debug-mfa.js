// Script de diagnóstico — NO es parte de la app, es solo para probar
// si el problema de "Código incorrecto o vencido" es del backend o de
// cómo se está generando el código por fuera (reloj desfasado, secreto
// viejo, etc.)
//
// Uso:
//   node prisma/debug-mfa.js admin
//
// Te va a mostrar el código de 6 dígitos que el SERVIDOR considera
// válido AHORA MISMO para ese usuario, generado con el secreto que
// realmente está guardado en tu base de datos — no uno de una web
// externa ni de una captura vieja.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as OTPAuth from "otpauth";

const db = new PrismaClient();

async function main() {
  const nombreUsuario = process.argv[2];
  if (!nombreUsuario) {
    console.log("Uso: node prisma/debug-mfa.js nombre-de-usuario");
    process.exit(1);
  }

  const usuario = await db.usuario.findUnique({ where: { usuario: nombreUsuario } });
  if (!usuario) {
    console.log(`No existe ningún usuario con el nombre de usuario "${nombreUsuario}"`);
    process.exit(1);
  }
  if (!usuario.mfaSecret) {
    console.log(`${nombreUsuario} no tiene ningún secreto MFA guardado todavía.`);
    process.exit(1);
  }

  const totp = new OTPAuth.TOTP({
    issuer: "Activo360",
    label: usuario.usuario,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(usuario.mfaSecret),
  });

  const ahora = new Date();
  const codigo = totp.generate();
  const segundosRestantes = 30 - (Math.floor(ahora.getTime() / 1000) % 30);

  console.log("\n Hora del servidor ahora mismo:", ahora.toISOString());
  console.log(" Secreto guardado en la base de datos:", usuario.mfaSecret);
  console.log(" Código válido en este momento:", codigo);
  console.log(` Le quedan ${segundosRestantes}s antes de que cambie.\n`);
  console.log(" Copia ESE código (no el de ninguna web externa) y pégalo");
  console.log(" en el login ahora mismo, antes de que cambie.\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
