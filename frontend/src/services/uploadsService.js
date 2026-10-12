import { fetchConSesion, ApiError } from "./apiClient";

async function mensajeDeError(respuesta, porDefecto) {
  try {
    const json = await respuesta.json();
    return json?.error?.message || porDefecto;
  } catch {
    return porDefecto;
  }
}

/**
 * Sube un archivo real al backend y devuelve { url, nombre } — ese
 * resultado es lo que se manda después en el resto del formulario
 * (ej. crearContrato({ ...datos, archivoNombre: nombre, archivoUrl: url })).
 * No pasa por apiRequest porque ese está armado para JSON — acá el
 * body es FormData (multipart), así que no debe llevar
 * "Content-Type: application/json" ni JSON.stringify. Sí usa
 * fetchConSesion, para renovar la sesión si la cookie ya venció.
 */
export async function subirArchivo(archivo) {
  const formData = new FormData();
  formData.append("archivo", archivo);

  const respuesta = await fetchConSesion("/uploads", { method: "POST", body: formData });
  if (!respuesta.ok) {
    throw new ApiError("SUBIDA_FALLIDA", await mensajeDeError(respuesta, "No se pudo subir el archivo."), respuesta.status);
  }
  return respuesta.json(); // { url, nombre }
}

/**
 * Descarga un archivo protegido ("/api/uploads/xxx.jpg") como Blob.
 * Un <a href target="_blank"> no sirve para esto: el navegador lo pide
 * por su cuenta, sin pasar por la renovación automática de la sesión,
 * y pasados 15 min la cookie de acceso ya venció y el enlace abre un
 * error en vez del archivo.
 */
export async function obtenerArchivo(archivoUrl, { signal } = {}) {
  const respuesta = await fetchConSesion(archivoUrl, { signal });
  if (!respuesta.ok) {
    throw new ApiError("ARCHIVO_NO_DISPONIBLE", await mensajeDeError(respuesta, "No se pudo abrir el archivo."), respuesta.status);
  }
  // Un index.html en vez del archivo = la URL no llegó a /api/uploads
  // (cayó en el fallback de la SPA). Mejor un error claro que una
  // página en blanco dentro del visor.
  if ((respuesta.headers.get("content-type") || "").startsWith("text/html")) {
    throw new ApiError("ARCHIVO_NO_DISPONIBLE", "No se pudo abrir el archivo.", respuesta.status);
  }
  return respuesta.blob();
}
