import express from "express";
import cors from "cors";
import helmet from "helmet";
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

export const app = express();

// Solo en producción: si esto termina corriendo detrás de Nginx u otro
// proxy en el servidor real, Express necesita esto para que
// req.ip sea la IP real del navegante y no la del proxy — sin esto,
// el límite de intentos de login vería a TODOS los usuarios como si
// fueran una sola IP compartida (la del proxy), y bastaría con que uno
// solo agote el límite para bloquear a todos los demás.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// helmet agrega varias cabeceras HTTP de seguridad estándar (evita que
// el navegador adivine el tipo de archivo, bloquea que esta API se
// cargue dentro de un <iframe> ajeno, etc.). Se desactiva el CSP
// (pensado para servir HTML) porque acá el backend es puro JSON +
// archivos — y crossOriginResourcePolicy se relaja a "cross-origin"
// porque el frontend vive en otro puerto/dominio y necesita poder
// mostrar las fotos/PDFs que sirve /uploads.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// credentials:true es obligatorio para que el navegador acepte enviar
// y recibir las cookies httpOnly entre el frontend (Vite, otro puerto)
// y este backend — sin esto, las cookies de sesión nunca llegan.
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
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

// Siempre al final — Express solo lo usa si algo antes llamó a next(error).
app.use(manejadorDeErrores);
