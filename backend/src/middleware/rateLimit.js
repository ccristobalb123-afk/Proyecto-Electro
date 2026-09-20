import rateLimit from "express-rate-limit";

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
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiteExcedido("Demasiados intentos. Espera unos minutos antes de volver a intentar."),
});

// Más estricto — "olvidé mi contraseña" dispara un correo real cada vez,
// nadie necesita pedirlo más de un puñado de veces por hora.
export const limiteRecuperarPassword = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiteExcedido("Ya solicitaste varios enlaces de recuperación. Espera una hora antes de pedir otro."),
});
