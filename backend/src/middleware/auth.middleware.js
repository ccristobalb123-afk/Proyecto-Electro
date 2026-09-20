import { verificarAccessToken } from "../lib/jwt.js";
import { db } from "../lib/db.js";
import { noAutenticado, sesionExpirada, sinPermiso } from "../lib/errors.js";
import { modulosDe } from "../lib/roles.js";
import { NOMBRE_COOKIE_ACCESS } from "../lib/cookies.js";

// Lee la cookie httpOnly del access token, la valida, y carga el
// usuario real desde la base de datos (no solo lo que dice el token) —
// así si el usuario fue desactivado hace 2 minutos, esta misma petición
// ya lo rechaza en vez de esperar a que el token expire solo.
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[NOMBRE_COOKIE_ACCESS];

  // Sin cookie: nunca hubo sesión (o ya se cerró) — no es lo mismo que
  // "tenías sesión y se venció". El frontend le muestra al usuario un
  // mensaje distinto según cuál de las dos pase, y en la primera no
  // debe disparar ningún aviso (es la situación normal al abrir la app
  // sin haber iniciado sesión antes).
  if (!token) return next(noAutenticado());

  try {
    const payload = verificarAccessToken(token);
    const usuario = await db.usuario.findUnique({
      where: { id: payload.sub },
      include: {
        empresas: { include: { empresa: true } },
        modulos: true,
      },
    });
    if (!usuario || !usuario.activo) throw new Error("usuario inválido");

    req.usuario = usuario;
    // Slugs de las empresas a las que este usuario tiene acceso — lo
    // usan requireEmpresa() y los services para no dejar ver ni tocar
    // datos de una empresa a la que el usuario no pertenece.
    req.empresasPermitidas = usuario.empresas.map((ue) => ue.empresa.slug);
    next();
  } catch {
    // Había un token pero no es válido (venció, fue alterado, o el
    // usuario ya no existe/está inactivo) — acá sí es "tu sesión venció".
    next(sesionExpirada());
  }
}

// Uso: router.get("/equipos", requireAuth, requireModulo("operaciones"), ...)
// Verifica que el usuario autenticado tenga acceso al módulo pedido —
// el mismo chequeo que ProtectedRoute ya hace en el frontend, pero
// ahora también en el servidor (el frontend nunca es suficiente:
// cualquiera puede llamar a la API directo, sin pasar por la UI).
export function requireModulo(modulo) {
  return (req, res, next) => {
    if (!modulosDe(req.usuario).includes(modulo)) {
      return next(sinPermiso());
    }
    next();
  };
}

// Solo el SuperAdmin puede activar/desactivar a otros usuarios como
// SuperAdmin — nadie más puede otorgarse (ni a otros) control total,
// aunque tenga acceso a Administración.
export function requireSuperAdmin(req, res, next) {
  if (!req.usuario.esSuperAdmin) return next(sinPermiso());
  next();
}
