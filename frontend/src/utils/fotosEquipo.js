// Fotos de equipos servidas por la API: /api/equipos/:id/foto-actual/:n?v=…
// (actuales) y /api/equipos/:id/fotos/:fotoId (historial). Con ?tam=480 el
// backend devuelve una miniatura JPEG de 480 px de ancho (~36 kB en vez de
// ~260 kB): basta para las tarjetas y miniaturas, incluso en pantallas 3x.
// El visor ampliado (Lightbox) usa siempre la URL original.
export const ANCHO_MINIATURA = 480; // el backend solo acepta los anchos de TAMANOS_MINIATURA

const FOTO_API = /^\/api\/equipos\/\d+\/(foto-actual|fotos)\/\d+(\?|$)/;

/** URL de la miniatura; cualquier otra cosa (foto nueva en data URL, null) queda igual. */
export function urlMiniatura(url) {
  if (typeof url !== "string" || !FOTO_API.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}tam=${ANCHO_MINIATURA}`;
}
