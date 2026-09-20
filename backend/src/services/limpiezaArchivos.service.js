import path from "node:path";
import fs from "node:fs";
import { empresasDelArchivo } from "../lib/archivos.js";

const CARPETA_UPLOADS = path.resolve("uploads");
// Le da tiempo de sobra a que la persona termine el formulario que iba
// a guardar el archivo — no queremos borrar algo que se subió hace 2
// minutos y todavía está en camino de asociarse a un contrato.
const HORAS_DE_GRACIA = 24;

export async function limpiarArchivosHuerfanos() {
  if (!fs.existsSync(CARPETA_UPLOADS)) return;

  const archivos = fs.readdirSync(CARPETA_UPLOADS);
  let eliminados = 0;

  for (const archivo of archivos) {
    const rutaCompleta = path.join(CARPETA_UPLOADS, archivo);
    const stats = fs.statSync(rutaCompleta);
    const horasDesdeCreado = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
    if (horasDesdeCreado < HORAS_DE_GRACIA) continue;

    const empresas = await empresasDelArchivo(`/api/uploads/${archivo}`);
    if (empresas === null) {
      fs.unlinkSync(rutaCompleta);
      eliminados++;
    }
  }

  if (eliminados > 0) {
    console.log(`Limpieza de archivos: ${eliminados} archivo(s) huérfano(s) eliminado(s).`);
  }
}
