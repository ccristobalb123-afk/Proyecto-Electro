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

const TIPOS_PERMITIDOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CARPETA_UPLOADS),
  filename: (req, file, cb) => {
    // Nombre aleatorio (no el nombre original) — evita que 2 personas
    // subiendo "soat.pdf" el mismo día se pisen el archivo, y evita
    // path traversal si alguien manda un nombre de archivo malicioso.
    const nombreAleatorio = crypto.randomBytes(16).toString("hex");
    cb(null, `${nombreAleatorio}${path.extname(file.originalname)}`);
  },
});

export const subirArchivo = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
      return cb(validacionFallida("Solo se permiten archivos PDF, JPG, PNG o WEBP."));
    }
    cb(null, true);
  },
}).single("archivo");
