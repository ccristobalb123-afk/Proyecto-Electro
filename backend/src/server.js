import "dotenv/config";
import { app } from "./app.js";
import { revisarVencimientosYNotificar } from "./services/vencimientos.service.js";
import { limpiarArchivosHuerfanos } from "./services/limpiezaArchivos.service.js";
import { limpiarSesiones } from "./services/sesiones.service.js";

const PORT = process.env.PORT || 3001;

// Solo se escucha en loopback: el único que entra es el túnel de
// Cloudflare (cloudflared corre en esta misma máquina y se conecta a
// localhost). Antes escuchaba en todas las interfaces y el sistema
// quedaba abierto, sin HTTPS ni Cloudflare, a la red local y a Tailscale.
// IPv4 e IPv6 porque "localhost" puede resolverse a cualquiera de los dos.
// HOST en .env (lista separada por comas) permite cambiarlo sin tocar código.
const HOSTS = (process.env.HOST || "127.0.0.1,::1").split(",").map((h) => h.trim()).filter(Boolean);
for (const host of HOSTS) {
  app.listen(PORT, host, () => {
    console.log(`API escuchando en http://${host.includes(":") ? `[${host}]` : host}:${PORT}`);
  });
}

// Revisa contratos/cursos/documentos/inspecciones por vencer y manda
// las notificaciones push que correspondan. Corre una vez al arrancar
// el servidor y después cada 12 horas — para esta escala (una sola
// laptop-servidor) no hace falta un sistema de colas aparte, un
// setInterval adentro del mismo proceso alcanza.
const DOCE_HORAS = 12 * 60 * 60 * 1000;
revisarVencimientosYNotificar().catch((err) => console.error("Error revisando vencimientos:", err));
setInterval(() => {
  revisarVencimientosYNotificar().catch((err) => console.error("Error revisando vencimientos:", err));
}, DOCE_HORAS);

// Borra archivos que se subieron pero nunca quedaron asociados a
// ningún contrato/factura/gasto/documento (ej. se subió el PDF pero
// falló el paso siguiente) — corre una vez al día, no hace falta más
// seguido para esto.
const VEINTICUATRO_HORAS = 24 * 60 * 60 * 1000;
limpiarArchivosHuerfanos().catch((err) => console.error("Error limpiando archivos huérfanos:", err));
setInterval(() => {
  limpiarArchivosHuerfanos().catch((err) => console.error("Error limpiando archivos huérfanos:", err));
}, VEINTICUATRO_HORAS);

// Cada hora: deja cerradas las sesiones vencidas (inactividad o 12 h) y
// borra las de hace más de 30 días con sus refresh tokens — antes la
// tabla refresh_tokens crecía sin límite.
const UNA_HORA = 60 * 60 * 1000;
limpiarSesiones().catch((err) => console.error("Error limpiando sesiones:", err));
setInterval(() => {
  limpiarSesiones().catch((err) => console.error("Error limpiando sesiones:", err));
}, UNA_HORA);
