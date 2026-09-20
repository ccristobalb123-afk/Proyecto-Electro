import { Router } from "express";
import { z } from "zod";
import * as gastosController from "../controllers/gastos.controller.js";
import { requireAuth, requireModulo } from "../middleware/auth.middleware.js";
import { validar } from "../middleware/validar.js";

const agregarCategoriaGastoSchema = z.object({
  nombre: z.string().trim().min(2, "Ponle un nombre a la categoría."),
});

const router = Router();

router.use(requireAuth, requireModulo("finanzas"));

router.get("/", gastosController.getCategoriasGasto);
router.post("/", validar(agregarCategoriaGastoSchema), gastosController.postCategoriaGasto);
router.patch("/:nombre", validar(agregarCategoriaGastoSchema), gastosController.patchCategoriaGasto);
router.delete("/:nombre", gastosController.deleteCategoriaGasto);

export default router;
