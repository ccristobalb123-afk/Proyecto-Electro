// ============================================================
// Fotos de equipos: siempre 2 por equipo.
//
// Las fotos llegan del celular ya comprimidas (JPEG de hasta 1280 px, ver
// frontend/src/utils/imageUtils.js) como data URL, y así se guardan en
// equipos.fotos. Para el historial, cada foto distinta se guarda además
// UNA vez en fotos_equipo (por su hash): las inspecciones y los cambios
// de fotos la referencian por id, y una foto reemplazada no se borra.
//
// Cómo se sirven: las respuestas de la API nunca llevan la foto, solo su
// URL. GET /api/equipos (y las respuestas de crear/editar un equipo) y
// /api/equipos/asignaciones-actuales devuelven en `fotos`
// /api/equipos/:id/foto-actual/:n?v=<versión> (urlsFotosActuales en
// equipos.service.js), y el navegador la pide con un <img> normal: la
// cookie de sesión httpOnly viaja sola, así que el endpoint exige sesión,
// el módulo Operaciones y acceso a la empresa del equipo (401/403/404).
// `v` son los primeros 12 caracteres del sha256 de la foto (versionFoto):
// con la versión vigente responde "private, max-age=31536000, immutable"
// (el navegador no la vuelve a pedir); con otra o sin ella, "private,
// no-cache". Antes el listado llevaba las fotos en base64: ~23 MB con 66
// fotos; ahora ~23 kB, y cada foto se baja al verse y queda en caché.
// Las fotos del historial se sirven igual, por id, en
// /api/equipos/:id/fotos/:fotoId (siempre "immutable": otra foto = otro id).
//
// Miniaturas: las dos URLs aceptan ?tam=480 y devuelven una miniatura JPEG
// de 480 px de ancho (~36 kB en vez de ~260 kB), con los mismos controles y
// las mismas cabeceras de caché que la original. Otro valor de tam es un
// 400 (lista cerrada en TAMANOS_MINIATURA). El frontend la pide con
// urlMiniatura (frontend/src/utils/fotosEquipo.js) en las tarjetas de
// Equipos, las miniaturas de Asignaciones y del historial, y las casillas
// de "Editar fotos"/inspección; el visor ampliado usa la original.
// Se generan con sharp la primera vez y quedan en backend/cache/miniaturas
// (<sha256 de la foto>-<ancho>.jpg): fuera de uploads/, así que no van en
// los respaldos ni las toca la limpieza de uploads, y se pueden borrar
// cuando sea. Las que nadie pide en 90 días (p. ej. de fotos reemplazadas)
// las borra limpiarMiniaturas una vez al día. Detalle en lib/miniaturas.js.
//
// Pendiente (ver el diagnóstico de fotos): guardar la versión en una
// columna en vez de calcular el sha256 de cada foto en cada listado, y
// pasar los binarios a disco (backend/uploads).
// ============================================================
import crypto from "node:crypto";
import { validacionFallida } from "./errors.js";

export const FOTOS_POR_EQUIPO = 2;
// Mantener la foto que ya tiene el equipo en esa posición.
export const MANTENER = "actual";

const FOTO_DATA = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
// Una foto comprimida pesa ~200–450 KB en base64; el límite deja margen
// y mantiene dos fotos nuevas por debajo del tope de 2 MB por pedido.
const LARGO_MAXIMO = 900_000;

/** Lanza 400 si `data` no es una foto nueva válida (JPG, PNG o WEBP en base64). */
export function validarFotoNueva(data, numero) {
  if (typeof data !== "string" || !FOTO_DATA.test(data)) {
    throw validacionFallida(`La foto ${numero} no es una imagen válida (JPG, PNG o WEBP).`);
  }
  if (data.length > LARGO_MAXIMO) {
    throw validacionFallida(`La foto ${numero} es demasiado grande. Tómala de nuevo o elige otra imagen.`);
  }
}

/** Fotos de un equipo nuevo: exactamente 2, nuevas y válidas. */
export function fotosDeRegistro(fotos) {
  if (!Array.isArray(fotos) || fotos.filter(Boolean).length !== FOTOS_POR_EQUIPO || fotos.length !== FOTOS_POR_EQUIPO) {
    throw validacionFallida("Agrega las 2 fotos del equipo.");
  }
  fotos.forEach((f, i) => validarFotoNueva(f, i + 1));
  return fotos;
}

/**
 * Resultado de mantener o cambiar cada foto. `entrada`: 2 elementos, cada
 * uno "actual" (mantener la que tiene el equipo en esa posición) o una
 * foto nueva. `actuales`: equipos.fotos. Devuelve las 2 fotos finales, las
 * reemplazadas y qué posiciones cambiaron. Nunca deja menos ni más de 2.
 */
export function resolverFotos(entrada, actuales) {
  if (!Array.isArray(entrada) || entrada.length !== FOTOS_POR_EQUIPO) {
    throw validacionFallida("El equipo debe quedar con exactamente 2 fotos.");
  }
  const previas = Array.isArray(actuales) ? actuales : [];
  const fotos = [];
  const reemplazadas = [];
  const cambiadas = [];
  entrada.forEach((valor, i) => {
    if (valor === MANTENER) {
      if (!previas[i]) throw validacionFallida(`Falta la foto ${i + 1}: el equipo no tiene una foto en esa posición. Agrégala para guardar.`);
      fotos.push(previas[i]);
      return;
    }
    if (!valor) throw validacionFallida(`Falta la foto ${i + 1}: el equipo debe quedar con 2 fotos.`);
    validarFotoNueva(valor, i + 1);
    fotos.push(valor);
    if (valor !== previas[i]) {
      cambiadas.push(i + 1);
      if (previas[i]) reemplazadas.push(previas[i]);
    }
  });
  return { fotos, reemplazadas, cambiadas };
}

/** sha256 (hex) de una foto guardada: su identidad (fotos_equipo.hash, miniaturas). */
export const hashFoto = (data) => crypto.createHash("sha256").update(data).digest("hex");

/** Guarda (una sola vez) cada foto en fotos_equipo y devuelve sus ids, en orden. */
export async function guardarFotos(tx, equipoId, datas) {
  const ids = [];
  for (const data of datas) {
    const hash = hashFoto(data);
    const foto = await tx.fotoEquipo.upsert({
      where: { equipoId_hash: { equipoId, hash } },
      create: { equipoId, hash, data },
      update: {},
      select: { id: true },
    });
    ids.push(foto.id);
  }
  return ids;
}

/** "se cambió la foto 1" / "se cambiaron las 2 fotos" (para el historial). */
export function textoFotosCambiadas(cambiadas) {
  if (!cambiadas.length) return "";
  return cambiadas.length === 1 ? `se cambió la foto ${cambiadas[0]}` : "se cambiaron las 2 fotos";
}

/** { mime, buffer } de un data URL guardado. */
export function decodificarFoto(data) {
  const coma = data.indexOf(",");
  return { mime: data.slice(5, data.indexOf(";")), buffer: Buffer.from(data.slice(coma + 1), "base64") };
}

/**
 * Versión corta de una foto (para su URL): cambia si cambia la foto, así
 * el navegador puede guardarla en caché sin quedarse con una vieja.
 */
export const versionFoto = (data) => hashFoto(data).slice(0, 12);
