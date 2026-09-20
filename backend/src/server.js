import "dotenv/config";
import { app } from "./app.js";
import { revisarVencimientosYNotificar } from "./services/vencimientos.service.js";
import { limpiarArchivosHuerfanos } from "./services/limpiezaArchivos.service.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});

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
