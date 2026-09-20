import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { subirArchivo } from "../middleware/upload.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler, validacionFallida, ApiError, sinPermiso } from "../lib/errors.js";
import { empresasDelArchivo } from "../lib/archivos.js";

const CARPETA_UPLOADS = path.resolve("uploads");

const router = Router();

router.use(requireAuth);

// Un solo endpoint genérico para subir cualquier archivo (foto, PDF,
// comprobante...) — todos los módulos lo usan igual: se sube el
// archivo acá primero, y la URL que devuelve es lo que se manda en el
// resto del formulario (ej. crear un contrato ya con su archivoUrl).
router.post(
  "/",
  (req, res, next) =>
    subirArchivo(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return next(validacionFallida("El archivo no puede superar los 10 MB."));
      }
      next(err);
    }),
  asyncHandler(async (req, res) => {
    if (!req.file) throw validacionFallida("No se recibió ningún archivo.");
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

    res.sendFile(rutaCompleta);
  })
);

export default router;
