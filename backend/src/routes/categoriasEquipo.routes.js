import { Router } from "express";
import * as categoriasController from "../controllers/categoriasEquipo.controller.js";
import { requireAuth, requireModulo } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireModulo("operaciones"));

// Solo lectura: los tipos de equipo son fijos (ver src/lib/tiposEquipo.js).
// Ya no se crean, renombran ni eliminan categorías desde la aplicación.
router.get("/", categoriasController.getCategorias);

export default router;
