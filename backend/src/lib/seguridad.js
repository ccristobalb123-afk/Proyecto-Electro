// ============================================================
// Seguridad transversal: IP real del cliente, cabeceras (CSP y demás),
// auditoría de acciones y validación de archivos por su contenido.
// ============================================================
import fs from "node:fs/promises";
import helmet from "helmet";

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/**
 * IP real del navegante, para el límite de intentos y la auditoría.
 * En producción todo llega por el túnel de Cloudflare (cloudflared, que
 * se conecta desde esta misma máquina): solo en ese caso se confía en
 * CF-Connecting-IP / X-Forwarded-For. Si alguien se conecta DIRECTO al
 * puerto (por ejemplo desde la red local), se usa la IP de la conexión y
 * no lo que él diga en las cabeceras — antes, con `trust proxy = 1`,
 * bastaba con mandar un X-Forwarded-For distinto en cada intento para
 * saltarse el límite.
 */
export function ipCliente(req) {
  if (LOOPBACK.has(req.socket?.remoteAddress)) {
    const cf = req.headers["cf-connecting-ip"];
    if (typeof cf === "string" && cf.trim()) return cf.trim();
  }
  return req.ip;
}

// Para app.set("trust proxy", …): solo se confía en el proxy local.
export const PROXY_DE_CONFIANZA = "loopback";

/**
 * Cabeceras de seguridad. La CSP está pensada para el frontend que sirve
 * este mismo backend (frontend/dist):
 *   - scripts solo propios (Vite genera módulos, sin código en línea);
 *   - estilos propios + Google Fonts; style-src-attr permite los estilos
 *     en atributo que usan algunos componentes;
 *   - imágenes data:/blob: para el QR del MFA, las fotos de equipos
 *     (base64) y el visor de archivos;
 *   - frame-src/object-src con blob: para el visor de PDF (el documento
 *     blob hereda esta CSP y el visor de PDF de Chrome cuenta como plugin).
 * CSP_SOLO_REPORTE=1 en .env la pasa a "Report-Only" sin tocar código, por
 * si algo del sitio dejara de funcionar después de desplegarla.
 */
export function cabecerasDeSeguridad() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      reportOnly: process.env.CSP_SOLO_REPORTE === "1",
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        styleSrcAttr: ["'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        frameSrc: ["'self'", "blob:"],
        objectSrc: ["'self'", "blob:"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        ...(process.env.CSP_REPORT_URI ? { reportUri: [process.env.CSP_REPORT_URI] } : {}),
      },
    },
    // Todo se sirve desde el mismo sitio: ya no hace falta "cross-origin".
    crossOriginResourcePolicy: { policy: "same-site" },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });
}

// La app no usa cámara (las fotos van por <input type="file">), micrófono,
// ubicación ni pagos: se apagan para cualquier script que llegara a colarse.
export function permissionsPolicy(req, res, next) {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );
  next();
}

/**
 * Auditoría: cada acción que modifica datos (POST/PUT/PATCH/DELETE en
 * /api) queda en el log de PM2 como una línea "AUDITORIA {json}" con
 * fecha, usuario, IP, método, ruta y resultado. Nunca se registra el
 * cuerpo (podría traer contraseñas); en el login solo el nombre de
 * usuario, para poder ver los intentos fallidos.
 */
export function auditoria(req, res, next) {
  if (!req.originalUrl.startsWith("/api/") || !["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  res.on("finish", () => {
    const ruta = req.originalUrl.split("?")[0];
    const esLogin = ruta === "/api/auth/login";
    const evento = {
      fecha: new Date().toISOString(),
      usuarioId: req.usuario?.id ?? null,
      ...(esLogin && typeof req.body?.usuario === "string" ? { intentoUsuario: req.body.usuario.slice(0, 60) } : {}),
      ip: ipCliente(req),
      metodo: req.method,
      ruta,
      estado: res.statusCode,
      ...(esLogin ? { resultado: res.statusCode < 400 ? "login_ok" : "login_fallido" } : {}),
    };
    console.log("AUDITORIA " + JSON.stringify(evento));
  });
  next();
}

// Firmas ("magic bytes") de los únicos tipos que se aceptan. El tipo MIME
// lo declara el navegador y se puede falsificar; el contenido no.
const FIRMAS = {
  "application/pdf": (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
};

/** true si el contenido real del archivo coincide con su tipo declarado. */
export async function contenidoCoincideConTipo(ruta, mimetype) {
  const comprobar = FIRMAS[mimetype];
  if (!comprobar) return false;
  const archivo = await fs.open(ruta, "r");
  try {
    const { buffer, bytesRead } = await archivo.read(Buffer.alloc(16), 0, 16, 0);
    return bytesRead >= 12 && comprobar(buffer);
  } finally {
    await archivo.close();
  }
}
