import rateLimit from "express-rate-limit";
import { ipCliente } from "../lib/seguridad.js";

// Todos los límites usan la IP REAL (ver ipCliente): la de Cloudflare si
// el pedido llegó por el túnel, la de la conexión si llegó directo.
const porIp = { keyGenerator: ipCliente };

// Respuesta con el mismo sobre uniforme que ya usa el resto del backend
// ({ ok: false, error: { code, message } }) — así el apiClient del
// frontend no necesita ningún caso especial para manejar un 429.
function limiteExcedido(mensaje) {
  return (req, res) => {
    res.status(429).json({ ok: false, error: { code: "DEMASIADOS_INTENTOS", message: mensaje } });
  };
}

// 10 intentos cada 15 minutos por IP — alcanza de sobra para alguien
// que se equivoca de contraseña varias veces, pero corta en seco un
// intento de fuerza bruta (probar miles de contraseñas seguidas).
export const limiteLogin = rateLimit({
  ...porIp,
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiteExcedido("Demasiados intentos. Espera unos minutos antes de volver a intentar."),
});

// El código MFA tiene su propia ventana corta (30s) — 10 intentos cada
// 15 min es más que suficiente incluso si el reloj del celular está
// desfasado y hay que probar un par de veces.
export const limiteMfa = rateLimit({
  ...porIp,
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiteExcedido("Demasiados intentos. Espera unos minutos antes de volver a intentar."),
});

// Más estricto — "olvidé mi contraseña" dispara un correo real cada vez,
// nadie necesita pedirlo más de un puñado de veces por hora.
export const limiteRecuperarPassword = rateLimit({
  ...porIp,
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiteExcedido("Ya solicitaste varios enlaces de recuperación. Espera una hora antes de pedir otro."),
});

// Además del límite por IP, uno por CUENTA: 10 contraseñas incorrectas en
// 15 minutos bloquean ese usuario (aunque el atacante cambie de IP). Los
// intentos correctos no cuentan.
export const limiteLoginPorUsuario = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => "usuario:" + String(req.body?.usuario ?? "").trim().toLowerCase(),
  handler: limiteExcedido("Demasiados intentos fallidos para este usuario. Espera 15 minutos o restablece tu contraseña."),
});

// Subidas de archivos: 60 cada 15 minutos por usuario — de sobra para el
// uso normal, pero corta a quien intente llenar el disco.
export const limiteSubidas = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.usuario ? "usuario:" + req.usuario.id : ipCliente(req)),
  handler: limiteExcedido("Subiste demasiados archivos seguidos. Espera unos minutos."),
});
