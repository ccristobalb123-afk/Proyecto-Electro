import { Router } from "express";
import * as categoriasController from "../controllers/categoriasEquipo.controller.js";
import { requireAuth, requireModulo, requireSuperAdmin } from "../middleware/auth.middleware.js";
import { validar } from "../middleware/validar.js";
import { crearTipoEquipoSchema, actualizarTipoEquipoSchema } from "../validators/operaciones.validators.js";

const router = Router();

router.use(requireAuth, requireModulo("operaciones"));

// Tipos de equipo con sus reglas (ver categoriasEquipo.service.js).
router.get("/", categoriasController.getCategorias);
router.get("/gestion", categoriasController.getGestion);
// Crear: cualquier usuario con acceso a Operaciones.
router.post("/", validar(crearTipoEquipoSchema), categoriasController.postTipo);
// Corregir (renombrar, destino, varias unidades, datos que pide,
// desactivar/reactivar) y eliminar: solo SuperAdmin.
router.patch("/:id", requireSuperAdmin, validar(actualizarTipoEquipoSchema), categoriasController.patchTipo);
router.delete("/:id", requireSuperAdmin, categoriasController.deleteTipo);

export default router;
