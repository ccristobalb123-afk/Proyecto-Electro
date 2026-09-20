// Resetea el MFA de un usuario para poder configurarlo de nuevo desde
// la app, escaneando el QR real con Google Authenticator/Authy — en
// vez de depender del secreto que dejó puesto el seed (que solo sirve
// para probar rápido con node prisma/debug-mfa.js).
//
// Uso:
//   node prisma/reset-mfa.js admin
//
// Después de correrlo, la próxima vez que ese usuario inicie sesión,
// la app le va a mostrar el paso de "Configura la verificación en dos
// pasos" con un QR nuevo para escanear — igual que le pasaría a
// cualquier Administrador nuevo que crees desde Administración.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const nombreUsuario = process.argv[2];
  if (!nombreUsuario) {
    console.log("Uso: node prisma/reset-mfa.js nombre-de-usuario");
    process.exit(1);
  }

  const usuario = await db.usuario.findUnique({ where: { usuario: nombreUsuario } });
  if (!usuario) {
    console.log(`No existe ningún usuario con el nombre de usuario "${nombreUsuario}"`);
    process.exit(1);
  }

  await db.usuario.update({
    where: { id: usuario.id },
    data: { mfaSecret: null, mfaHabilitado: false },
  });

  console.log(`\n MFA reseteado para "${nombreUsuario}".`);
  console.log(" La próxima vez que inicie sesión, la app le va a mostrar un QR nuevo para escanear.\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
