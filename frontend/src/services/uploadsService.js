const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

/**
 * Sube un archivo real al backend y devuelve { url, nombre } — ese
 * resultado es lo que se manda después en el resto del formulario
 * (ej. crearContrato({ ...datos, archivoNombre: nombre, archivoUrl: url })).
 * No pasa por apiClient.js porque ese está armado para JSON — acá el
 * body es FormData (multipart), así que no debe llevar
 * "Content-Type: application/json" ni JSON.stringify.
 */
export async function subirArchivo(archivo) {
  const formData = new FormData();
  formData.append("archivo", archivo);

  const respuesta = await fetch(`${BASE_URL}/uploads`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const json = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(json?.error?.message || "No se pudo subir el archivo.");
  }
  return json; // { url, nombre }
}
