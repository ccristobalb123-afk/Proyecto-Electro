import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { validacionFallida } from "../lib/errors.js";

// TODO backend (producción): esto guarda en el disco del propio
// servidor — funciona perfecto para una sola laptop-servidor, pero si
// algún día se despliega en varias instancias o se quiere hacer backup
// aparte de los archivos, migrar a S3/Backblaze/etc. es un cambio
// acotado a este archivo (el resto de la app solo conoce la URL que
// devuelve, no le importa dónde vive el archivo de verdad).
const CARPETA_UPLOADS = path.resolve("uploads");
if (!fs.existsSync(CARPETA_UPLOADS)) {
  fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });
}

// MIME permitido -> extensión con la que se guarda. La extensión sale
// del tipo ya validado, no del nombre original: una foto tomada con la
// cámara del celular puede llegar sin extensión (o como ".JPEG"), y
// sin una extensión conocida res.sendFile la sirve como
// application/octet-stream — con el "nosniff" de helmet el navegador
// entonces la descarga en vez de mostrarla.
// HEIC/HEIF no se aceptan a propósito: Chrome y Edge no los pueden
// mostrar, y iOS ya convierte la foto a JPEG al elegirla desde un
// <input accept="image/*">.
const EXTENSION_POR_TIPO = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CARPETA_UPLOADS),
  filename: (req, file, cb) => {
    // Nombre aleatorio (no el nombre original) — evita que 2 personas
    // subiendo "soat.pdf" el mismo día se pisen el archivo, y evita
    // path traversal si alguien manda un nombre de archivo malicioso.
    const nombreAleatorio = crypto.randomBytes(16).toString("hex");
    cb(null, `${nombreAleatorio}${EXTENSION_POR_TIPO[file.mimetype]}`);
  },
});

export const subirArchivo = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (!EXTENSION_POR_TIPO[file.mimetype]) {
      return cb(validacionFallida("Solo se permiten archivos PDF, JPG, PNG o WEBP."));
    }
    cb(null, true);
  },
}).single("archivo");
