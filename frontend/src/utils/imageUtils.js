// Comprime una imagen en el navegador antes de guardarla/subirla — clave
// porque una foto de celular sin comprimir puede pesar 3-8 MB, y acá se
// van a acumular hasta 2 fotos por equipo, en cientos de equipos.
// Reescala al ancho máximo indicado (manteniendo proporción) y la
// re-codifica como JPEG a la calidad indicada.
export function comprimirImagen(file, { maxAncho = 1280, calidad = 0.75 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("El archivo no es una imagen."));
      return;
    }
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
    lector.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo leer la imagen."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxAncho) {
          height = Math.round((height * maxAncho) / width);
          width = maxAncho;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", calidad));
      };
      img.src = e.target.result;
    };
    lector.readAsDataURL(file);
  });
}
