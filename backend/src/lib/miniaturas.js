// ============================================================
// Miniaturas de las fotos de equipos (ver lib/fotosEquipo.js).
//
// Se generan con sharp la primera vez que se piden y se guardan en
// backend/cache/miniaturas/<sha256 de la foto>-<ancho>.jpg. Esa carpeta es
// solo caché: NO está dentro de uploads/, así que no entra en los respaldos
// (backup.sh empaqueta solo uploads/) ni la toca limpiarArchivosHuerfanos
// (que solo recorre uploads/). Se puede borrar entera cuando sea: las
// miniaturas se vuelven a generar al pedirlas.
//
// - Tamaños: solo los de TAMANOS_MINIATURA (nadie puede pedir tamaños
//   arbitrarios y llenar el disco o la CPU).
// - JPEG (mozjpeg) calidad 75: con las fotos reales pesa ~36 kB de
//   promedio; WebP pesaba ~8 % menos, pero JPEG se ve en cualquier
//   navegador (Safari < 14 incluido) y se genera más rápido.
// - Respeta la orientación EXIF (rotate) y no guarda metadatos (sharp los
//   quita por defecto).
// - Dos pedidos a la vez de la misma miniatura la generan UNA vez, y como
//   mucho SIMULTANEAS miniaturas se generan a la vez (una laptop-servidor).
// - Limpieza: cada vez que se sirve una miniatura con más de una semana se
//   le renueva la fecha; limpiarMiniaturas (una vez al día, desde
//   server.js) borra las que llevan DIAS_SIN_USO días sin servirse. Así se
//   van las de fotos reemplazadas sin tener que consultar la base.
// ============================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { validacionFallida } from "./errors.js";

export const TAMANOS_MINIATURA = [480];
const CARPETA = path.resolve("cache", "miniaturas");
const SIMULTANEAS = 2;
const DIAS_SIN_USO = 90;
const UN_DIA = 24 * 60 * 60 * 1000;
const NOMBRE = /^[0-9a-f]{64}-\d+\.jpg$/;

sharp.cache(false); // sin caché de libvips en memoria: cada miniatura se genera una sola vez
sharp.concurrency(1); // un hilo por miniatura; el límite total lo pone SIMULTANEAS

/**
 * Ancho pedido en ?tam=: null si no viene (foto original). Cualquier valor
 * fuera de TAMANOS_MINIATURA es un 400.
 */
export function tamanoMiniatura(valor) {
  if (valor === undefined) return null;
  const n = typeof valor === "string" && /^[1-9]\d{0,3}$/.test(valor) ? Number(valor) : NaN; // "480" exacto, sin ceros delante
  if (!TAMANOS_MINIATURA.includes(n)) {
    throw validacionFallida(`Tamaño de miniatura no válido. Permitidos: ${TAMANOS_MINIATURA.join(", ")}.`);
  }
  return n;
}

// Turnos para sharp: como mucho SIMULTANEAS a la vez; al terminar, el
// turno pasa directo al siguiente que espera (sin que otro se cuele).
let activas = 0;
const esperando = [];
async function conTurno(fn) {
  if (activas >= SIMULTANEAS) await new Promise((resolver) => esperando.push(resolver));
  else activas++;
  try {
    return await fn();
  } finally {
    const siguiente = esperando.shift();
    if (siguiente) siguiente();
    else activas--;
  }
}

const enCurso = new Map(); // archivo -> promesa de su buffer

/**
 * Miniatura (JPEG) de la foto con ese sha256, del ancho pedido. Si no está
 * en disco, la genera con `cargarOriginal()` (que devuelve el Buffer de la
 * foto original; solo se llama si hace falta).
 */
export async function obtenerMiniatura(hash, tam, cargarOriginal) {
  if (!/^[0-9a-f]{64}$/.test(hash) || !TAMANOS_MINIATURA.includes(tam)) throw new Error("Miniatura no válida.");
  const archivo = path.join(CARPETA, `${hash}-${tam}.jpg`);
  try {
    const { mtimeMs } = await fs.promises.stat(archivo);
    const buffer = await fs.promises.readFile(archivo);
    if (Date.now() - mtimeMs > 7 * UN_DIA) {
      const ahora = new Date();
      fs.promises.utimes(archivo, ahora, ahora).catch(() => {});
    }
    return buffer;
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  let promesa = enCurso.get(archivo);
  if (!promesa) {
    promesa = generar(archivo, tam, cargarOriginal).finally(() => enCurso.delete(archivo));
    enCurso.set(archivo, promesa);
  }
  return promesa;
}

async function generar(archivo, tam, cargarOriginal) {
  const original = await cargarOriginal();
  const buffer = await conTurno(() =>
    sharp(original, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: tam, withoutEnlargement: true })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer()
  );
  // Escritura atómica (temporal + rename): nunca queda un archivo a medias.
  // Si falla (disco lleno, permisos), igual se responde la miniatura.
  const temporal = `${archivo}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  try {
    await fs.promises.mkdir(CARPETA, { recursive: true });
    await fs.promises.writeFile(temporal, buffer);
    await fs.promises.rename(temporal, archivo);
  } catch (err) {
    console.error("No se pudo guardar la miniatura:", err.message);
    fs.promises.unlink(temporal).catch(() => {});
  }
  return buffer;
}

/**
 * Borra las miniaturas que llevan DIAS_SIN_USO días sin servirse (fotos
 * reemplazadas o que nadie mira; si se vuelven a pedir, se regeneran) y
 * los temporales de más de un día. Devuelve cuántas borró.
 */
export async function limpiarMiniaturas(ahora = Date.now()) {
  let nombres;
  try {
    nombres = await fs.promises.readdir(CARPETA);
  } catch (err) {
    if (err.code === "ENOENT") return 0;
    throw err;
  }
  let borradas = 0;
  for (const nombre of nombres) {
    const limite = NOMBRE.test(nombre) ? DIAS_SIN_USO * UN_DIA : nombre.endsWith(".tmp") ? UN_DIA : null;
    if (limite === null) continue; // algo que no es nuestro: no se toca
    const ruta = path.join(CARPETA, nombre);
    try {
      const { mtimeMs } = await fs.promises.stat(ruta);
      if (ahora - mtimeMs > limite) {
        await fs.promises.unlink(ruta);
        borradas++;
      }
    } catch {
      // borrada mientras tanto: nada que hacer
    }
  }
  return borradas;
}
