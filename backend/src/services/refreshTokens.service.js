import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { db } from "../lib/db.js";

function hashToken(tokenCrudo) {
  return crypto.createHash("sha256").update(tokenCrudo).digest("hex");
}

// Se guarda el hash, nunca el token en sí — igual que con la
// recuperación de contraseña. La fecha de expiración se saca del
// propio JWT (su claim `exp`) para que siempre coincida exactamente
// con lo que el token realmente dice, sin duplicar la duración en 2
// lugares distintos.
export async function registrarRefreshToken(usuarioId, tokenCrudo) {
  const { exp } = jwt.decode(tokenCrudo);
  await db.refreshToken.create({
    data: { usuarioId, tokenHash: hashToken(tokenCrudo), expiraEn: new Date(exp * 1000) },
  });
}

// Además de la firma del JWT (que ya se revisa aparte), esto confirma
// que el token sigue "vivo" del lado del servidor — no fue cerrado por
// logout, ni revocado por un cambio de contraseña o una desactivación.
export async function refreshTokenValido(tokenCrudo) {
  const registro = await db.refreshToken.findUnique({ where: { tokenHash: hashToken(tokenCrudo) } });
  if (!registro || registro.revocadoEn || registro.expiraEn < new Date()) return null;
  return registro;
}

export async function revocarRefreshToken(tokenCrudo) {
  await db.refreshToken.updateMany({
    where: { tokenHash: hashToken(tokenCrudo), revocadoEn: null },
    data: { revocadoEn: new Date() },
  });
}

// Para cuando hay que cerrar TODAS las sesiones de alguien de una sola
// vez — cambió su contraseña, o un Administrador lo desactivó.
export async function revocarTodosLosRefreshTokens(usuarioId) {
  await db.refreshToken.updateMany({
    where: { usuarioId, revocadoEn: null },
    data: { revocadoEn: new Date() },
  });
}
