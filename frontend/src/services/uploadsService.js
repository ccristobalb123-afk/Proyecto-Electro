import { fetchConSesion, ApiError, BASE_URL, intentarRenovarSesion, avisarSesionExpirada } from "./apiClient";

async function mensajeDeError(respuesta, porDefecto) {
  try {
    const json = await respuesta.json();
    return json?.error?.message || porDefecto;
  } catch {
    return porDefecto;
  }
}

// Mismos límites que valida el backend (upload.middleware.js) — se
// revisan antes de enviar para no hacer esperar una subida de 30 MB por
// el celular solo para que el servidor la rechace al final.
export const TAMANO_MAXIMO_MB = 10;
const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const AYUDA_ARCHIVO = `PDF, JPG, PNG o WEBP, hasta ${TAMANO_MAXIMO_MB} MB`;

// Una subida grande por datos móviles puede tardar minutos y está bien;
// lo que no está bien es que deje de avanzar. Si pasan estos segundos
// sin que llegue ni un byte más, se corta con un mensaje claro.
const SIN_PROGRESO_MS = 45_000;

function validarArchivo(archivo) {
  if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
    const mb = (archivo.size / 1024 / 1024).toFixed(1);
    throw new ApiError("ARCHIVO_MUY_GRANDE", `El archivo pesa ${mb} MB y el máximo permitido es ${TAMANO_MAXIMO_MB} MB.`, 400);
  }
  if (archivo.type && !TIPOS_PERMITIDOS.includes(archivo.type)) {
    throw new ApiError("TIPO_NO_PERMITIDO", `Ese tipo de archivo no se acepta. Sube un ${AYUDA_ARCHIVO.replace(", hasta", " de hasta")}.`, 400);
  }
}

// XMLHttpRequest y no fetch: fetch todavía no informa el progreso de
// una subida, y en un celular con mala señal ver "Subiendo archivo… 40%"
// es la diferencia entre esperar y pensar que la app se colgó.
function enviar(archivo, onProgreso) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("archivo", archivo);

    // Se reinicia con cada avance; si se dispara, la subida está trabada.
    let vigilante;
    const reiniciarVigilante = () => {
      clearTimeout(vigilante);
      vigilante = setTimeout(() => xhr.abort(), SIN_PROGRESO_MS);
    };

    xhr.open("POST", new URL(BASE_URL + "/uploads", window.location.origin));
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      reiniciarVigilante();
      if (!e.lengthComputable) return;
      // Todo enviado → 100 ("Procesando archivo…"); antes de eso, como
      // mucho 99, para no mostrar "100%" con bytes todavía en camino.
      onProgreso?.(e.loaded >= e.total ? 100 : Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    // Último byte enviado: falta que el servidor lo reciba y responda.
    // Se avisa (100 → "Procesando archivo…") y se le da otro margen
    // completo, en vez de quedarse congelado en "99%".
    xhr.upload.onload = () => {
      reiniciarVigilante();
      onProgreso?.(100);
    };
    xhr.onload = () => {
      clearTimeout(vigilante);
      let json = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // respuesta sin cuerpo JSON
      }
      resolve({ status: xhr.status, json });
    };
    xhr.onerror = () => {
      clearTimeout(vigilante);
      reject(new ApiError("SIN_CONEXION", "Se perdió la conexión mientras se subía el archivo. Revisa tu señal e inténtalo de nuevo.", 0));
    };
    // El único abort() posible es el del vigilante: la subida se trabó.
    xhr.onabort = () => {
      clearTimeout(vigilante);
      reject(new ApiError("TIEMPO_AGOTADO", "La subida se detuvo: la conexión está muy lenta o se cortó. Inténtalo de nuevo con mejor señal.", 0));
    };
    reiniciarVigilante();
    xhr.send(formData);
  });
}

/**
 * Sube un archivo real al backend y devuelve { url, nombre } — ese
 * resultado es lo que se manda después en el resto del formulario
 * (ej. crearContrato({ ...datos, archivoNombre: nombre, archivoUrl: url })).
 * `onProgreso(porcentaje)` se llama mientras sube (ver useAccion).
 * Si la sesión venció a mitad de camino, la renueva y reintenta una vez.
 */
export async function subirArchivo(archivo, { onProgreso } = {}) {
  validarArchivo(archivo);
  onProgreso?.(0);

  let { status, json } = await enviar(archivo, onProgreso);
  const code = json?.error?.code;
  if (status === 401 && ["SESION_INACTIVA", "SESION_MAXIMA", "SESION_REVOCADA"].includes(code)) {
    avisarSesionExpirada(code);
  } else if (status === 401 && ["SESION_EXPIRADA", "NO_AUTENTICADO"].includes(code)) {
    const renovacion = await intentarRenovarSesion();
    if (renovacion.ok) {
      ({ status, json } = await enviar(archivo, onProgreso));
    } else if (renovacion.code !== "SIN_CONEXION") {
      avisarSesionExpirada(renovacion.code === "NO_AUTENTICADO" ? "SESION_EXPIRADA" : renovacion.code);
    }
  }
  if (status < 200 || status >= 300) {
    throw new ApiError(json?.error?.code || "SUBIDA_FALLIDA", json?.error?.message || "No se pudo subir el archivo. Inténtalo de nuevo.", status);
  }
  return json; // { url, nombre }
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
