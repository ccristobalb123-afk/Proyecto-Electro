import { Router } from "express";
import * as gastosController from "../controllers/gastos.controller.js";
import { requireAuth, requireModulo } from "../middleware/auth.middleware.js";
import { validar, validarQuery } from "../middleware/validar.js";
import { listarGastosQuerySchema, crearGastoSchema, comprobanteSchema } from "../validators/finanzas.validators.js";

const router = Router();

router.use(requireAuth, requireModulo("finanzas"));

router.get("/", validarQuery(listarGastosQuerySchema), gastosController.getGastos);
router.post("/", validar(crearGastoSchema), gastosController.postGasto);
router.patch("/:id", validar(crearGastoSchema), gastosController.patchGasto);
router.delete("/:id", gastosController.deleteGasto);
router.post("/:id/comprobante", validar(comprobanteSchema), gastosController.postComprobante);

export default router;
