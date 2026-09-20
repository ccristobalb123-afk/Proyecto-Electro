import { Router } from "express";
import * as categoriasController from "../controllers/categoriasEquipo.controller.js";
import { requireAuth, requireModulo } from "../middleware/auth.middleware.js";
import { validar } from "../middleware/validar.js";
import { agregarCategoriaSchema } from "../validators/operaciones.validators.js";

const router = Router();

router.use(requireAuth, requireModulo("operaciones"));

router.get("/", categoriasController.getCategorias);
router.post("/", validar(agregarCategoriaSchema), categoriasController.postCategoria);
router.patch("/:nombre", validar(agregarCategoriaSchema), categoriasController.patchCategoria);
router.delete("/:nombre", categoriasController.deleteCategoria);

export default router;
