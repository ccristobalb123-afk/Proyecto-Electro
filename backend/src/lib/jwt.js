import jwt from "jsonwebtoken";

// Dos tokens con secretos y duraciones distintas:
// - accessToken: vive poco (15 min por defecto), es el que se manda en
//   cada request y el que la app realmente usa para autorizar.
// - refreshToken: vive semanas, solo sirve para pedir un accessToken
//   nuevo sin que el usuario tenga que volver a loguearse. Si el
//   accessToken se filtra, el daño está acotado a esos 15 minutos.
export function firmarAccessToken(usuarioId) {
  return jwt.sign({ sub: usuarioId, tipo: "access" }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });
}

export function firmarRefreshToken(usuarioId) {
  return jwt.sign({ sub: usuarioId, tipo: "refresh" }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });
}

export function verificarAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export function verificarRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

// Se emite justo después de validar la contraseña, cuando el usuario
// necesita MFA — sin esto, /mfa-setup y /verify-mfa solo confiaban en
// el nombre de usuario que mandaba el cliente, así que cualquiera que
// conociera (o adivinara) un nombre de usuario podía pedir el secreto
// MFA de otra persona sin haber demostrado la contraseña. Dura 5
// minutos, justo lo necesario para completar el paso de MFA.
//
// Usa su propio secreto (JWT_MFA_PENDING_SECRET) en vez de reutilizar
// el del access token — así, si alguno de los dos se filtrara algún
// día, el otro sigue intacto. Si esa variable no está configurada
// todavía (por ejemplo, en un .env viejo que no la tiene), cae de
// vuelta al secreto de acceso para no romper el login de un día para
// el otro — pero conviene agregarla.
const SECRETO_MFA_PENDING = process.env.JWT_MFA_PENDING_SECRET || process.env.JWT_ACCESS_SECRET;

export function firmarMfaPendingToken(usuarioId) {
  return jwt.sign({ sub: usuarioId, tipo: "mfa_pending" }, SECRETO_MFA_PENDING, { expiresIn: "5m" });
}

export function verificarMfaPendingToken(token) {
  const payload = jwt.verify(token, SECRETO_MFA_PENDING);
  if (payload.tipo !== "mfa_pending") throw new Error("Token de tipo incorrecto.");
  return payload;
}
