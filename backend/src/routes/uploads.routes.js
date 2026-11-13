import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { subirArchivo } from "../middleware/upload.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler, validacionFallida, ApiError, sinPermiso } from "../lib/errors.js";
import { empresasDelArchivo } from "../lib/archivos.js";
import { contenidoCoincideConTipo } from "../lib/seguridad.js";
import { limiteSubidas } from "../middleware/rateLimit.js";

const CARPETA_UPLOADS = path.resolve("uploads");

// Errores al leer el formulario que son culpa de lo enviado (400), no del
// servidor. Antes solo "más de 10 MB" daba 400; un campo con otro nombre,
// dos archivos o una subida cortada a la mitad llegaban como 500.
// Los errores del disco (ENOSPC, EACCES…) siguen siendo 500.
const FORMULARIO_MAL_FORMADO = /^(Malformed part header|Multipart: Boundary not found|Unexpected end of file)$/;

function errorDeSubida(err) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return validacionFallida("El archivo no puede superar los 10 MB.");
    if (err.code === "LIMIT_UNEXPECTED_FILE" || err.code === "LIMIT_FILE_COUNT") {
      return validacionFallida("Envía un solo archivo en el campo \"archivo\".");
    }
    return validacionFallida("No se pudo procesar el archivo.");
  }
  if (err?.message === "Unexpected end of form") return validacionFallida("La subida se interrumpió. Vuelve a intentarlo.");
  if (FORMULARIO_MAL_FORMADO.test(err?.message || "")) return validacionFallida("No se pudo procesar el archivo.");
  return err; // ApiError (tipo no permitido) o error real del servidor
}

const router = Router();

router.use(requireAuth);

// Un solo endpoint genérico para subir cualquier archivo (foto, PDF,
// comprobante...) — todos los módulos lo usan igual: se sube el
// archivo acá primero, y la URL que devuelve es lo que se manda en el
// resto del formulario (ej. crear un contrato ya con su archivoUrl).
router.post(
  "/",
  limiteSubidas,
  (req, res, next) => subirArchivo(req, res, (err) => next(err ? errorDeSubida(err) : undefined)),
  asyncHandler(async (req, res) => {
    if (!req.file) throw validacionFallida("No se recibió ningún archivo.");
    // El tipo MIME lo declara el navegador (se puede falsificar): se
    // revisa también el contenido real del archivo. Antes se aceptaba,
    // por ejemplo, un HTML con script declarado como "image/png".
    if (!(await contenidoCoincideConTipo(req.file.path, req.file.mimetype))) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      throw validacionFallida("El contenido del archivo no corresponde a un PDF, JPG, PNG o WEBP válido.");
    }
    res.status(201).json({
      // Bajo /api para que pase por requireAuth de acá abajo — antes se
      // servía como estático en /uploads, accesible sin sesión por
      // cualquiera que tuviera el link (contratos, comprobantes...).
      url: `/api/uploads/${req.file.filename}`,
      nombre: req.file.originalname,
    });
  })
);

// Sirve el archivo solo si hay sesión activa Y el archivo pertenece a
// una empresa a la que el usuario tiene acceso — antes solo se
// revisaba lo primero, así que un usuario de Corevex podía abrir un
// PDF de Electro con solo conocer (o adivinar) el nombre aleatorio del
// archivo. Reemplaza al express.static público que había antes.
router.get(
  "/:filename",
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    if (filename.includes("/") || filename.includes("..")) {
      throw new ApiError(400, "VALIDACION", "Nombre de archivo inválido.");
    }

    const rutaCompleta = path.join(CARPETA_UPLOADS, filename);
    if (!fs.existsSync(rutaCompleta)) {
      throw new ApiError(404, "NO_ENCONTRADO", "El archivo no existe.");
    }

    const empresas = await empresasDelArchivo(`/api/uploads/${filename}`);
    // null = todavía no lo referencia ningún registro (recién subido,
    // el formulario que lo iba a guardar puede seguir en curso) — se
    // deja pasar porque ya está detrás de requireAuth, y negarlo acá
    // rompería el flujo normal de "subir archivo -> crear contrato".
    // Si SÍ tiene dueño, hay que pertenecer a esa empresa.
    if (empresas && !empresas.some((e) => req.empresasPermitidas.includes(e))) {
      throw sinPermiso();
    }

    // Aunque algo raro llegara a guardarse, el navegador no ejecuta nada:
    // CSP "sandbox" sin permisos, nombre de descarga controlado y sin caché
    // compartida (son documentos privados).
    res.set({
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Content-Disposition": `inline; filename="${filename.replace(/[^\w.-]/g, "")}"`,
      "Cross-Origin-Resource-Policy": "same-origin",
      "Cache-Control": "private, no-store",
    });
    res.sendFile(rutaCompleta, { dotfiles: "deny" });
  })
);

export default router;
