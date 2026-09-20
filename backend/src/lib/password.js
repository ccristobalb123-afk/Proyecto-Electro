import crypto from "node:crypto";

// Evita caracteres que se confunden fácil al leerlos en voz alta o
// escribirlos a mano (0/O, 1/l/I) — para cuando alguien tenga que
// dictarle esta contraseña temporal a otra persona por teléfono.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generarPasswordTemporal(longitud = 12) {
  const bytes = crypto.randomBytes(longitud);
  let resultado = "";
  for (let i = 0; i < longitud; i++) {
    resultado += ALFABETO[bytes[i] % ALFABETO.length];
  }
  return resultado;
}
