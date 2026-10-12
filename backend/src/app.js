import express from "express";
import path from "node:path";
import fs from "node:fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import contratosRoutes from "./routes/contratos.routes.js";
import cursosRoutes from "./routes/cursos.routes.js";
import personalRoutes from "./routes/personal.routes.js";
import categoriasEquipoRoutes from "./routes/categoriasEquipo.routes.js";
import equiposRoutes from "./routes/equipos.routes.js";
import vehiculosRoutes from "./routes/vehiculos.routes.js";
import facturasRoutes from "./routes/facturas.routes.js";
import facturasPorPagarRoutes from "./routes/facturasPorPagar.routes.js";
import gastosRoutes from "./routes/gastos.routes.js";
import categoriasGastoRoutes from "./routes/categoriasGasto.routes.js";
import catalogoDetraccionRoutes from "./routes/catalogoDetraccion.routes.js";
import uploadsRoutes from "./routes/uploads.routes.js";
import notificacionesRoutes from "./routes/notificaciones.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import { manejadorDeErrores } from "./lib/errors.js";
import { cabecerasDeSeguridad, permissionsPolicy, auditoria, PROXY_DE_CONFIANZA } from "./lib/seguridad.js";

export const app = express();

// En producción todo llega por el túnel de Cloudflare (cloudflared corre
// en esta misma máquina): solo se confía en las cabeceras de proxy si la
// conexión viene de localhost. Antes era `trust proxy = 1`, y cualquiera
// que se conectara directo al puerto desde la red local podía inventar
// su IP con X-Forwarded-For y saltarse el límite de intentos.
// (ver ipCliente en lib/seguridad.js)
app.set("trust proxy", PROXY_DE_CONFIANZA);
app.disable("x-powered-by");

// Cabeceras de seguridad con una CSP real (este backend también sirve
// el frontend), HSTS, sin <iframe> ajenos y Permissions-Policy.
// Ver lib/seguridad.js.
app.use(cabecerasDeSeguridad());
app.use(permissionsPolicy);

// credentials:true es obligatorio para que el navegador acepte enviar
// y recibir las cookies httpOnly entre el frontend (Vite, otro puerto)
// y este backend — sin esto, las cookies de sesión nunca llegan.
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
// 2 MB: las fotos de equipos viajan en base64 dentro del JSON (2 fotos
// comprimidas pueden pasar de los 100 KB que trae Express por defecto).
// Los archivos grandes van por /api/uploads (multipart, hasta 10 MB).
app.use(express.json({ limit: "2mb" }));
app.use(auditoria);
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/contratos", contratosRoutes);
app.use("/api/cursos-certificaciones", cursosRoutes);
app.use("/api/personal", personalRoutes);
app.use("/api/categorias-equipo", categoriasEquipoRoutes);
app.use("/api/equipos", equiposRoutes);
app.use("/api/vehiculos", vehiculosRoutes);
app.use("/api/facturas", facturasRoutes);
app.use("/api/facturas-por-pagar", facturasPorPagarRoutes);
app.use("/api/gastos", gastosRoutes);
app.use("/api/categorias-gasto", categoriasGastoRoutes);
app.use("/api/catalogo-detraccion", catalogoDetraccionRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Cualquier otra ruta de la API: 404 en JSON (antes respondía la página
// HTML de error de Express, que además delataba el framework).
app.use("/api", (req, res) => {
  res.status(404).json({ ok: false, error: { code: "NO_ENCONTRADO", message: "La ruta no existe." } });
});

// Sirve el frontend ya compilado (frontend/dist) desde este mismo
// backend — así, en producción, alcanza con exponer un solo puerto
// (útil para Cloudflare Tunnel, que apunta a un solo origen), en vez
// de correr 2 procesos separados. En desarrollo esta carpeta no
// existe todavía (recién se genera con `npm run build` dentro de
// frontend/), así que este bloque completo se salta solo.
const distFrontend = path.join(process.cwd(), "..", "frontend", "dist");
if (fs.existsSync(distFrontend)) {
  app.use(express.static(distFrontend));
  // Cualquier ruta que NO empiece con /api cae acá — así el router de
  // React (ej. /operaciones, /finanzas) sigue funcionando aunque el
  // usuario refresque la página estando en esa URL, en vez de darle
  // un 404 porque el servidor no conoce esa ruta.
  // Insensible a mayúsculas, igual que el router de Express: si no,
  // un pedido a "/API/..." que no matchea ninguna ruta (ej. un enlace
  // a archivo mal armado) recibía el index.html con 200 en vez de un
  // 404, y el navegador mostraba la app en blanco en vez de un error.
  app.get(/^(?!\/api(\/|$)).*/i, (req, res) => {
    res.sendFile(path.join(distFrontend, "index.html"));
  });
}

// Siempre al final — Express solo lo usa si algo antes llamó a next(error).
app.use(manejadorDeErrores);
