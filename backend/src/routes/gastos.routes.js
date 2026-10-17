import { Router } from "express";
import * as gastosController from "../controllers/gastos.controller.js";
import { requireAuth, requireModulo, requireSuperAdmin } from "../middleware/auth.middleware.js";
import { validar, validarQuery } from "../middleware/validar.js";
import { listarGastosQuerySchema, crearGastoSchema, actualizarGastoSchema, comprobanteSchema } from "../validators/finanzas.validators.js";

const router = Router();

router.use(requireAuth, requireModulo("finanzas"));

router.get("/", validarQuery(listarGastosQuerySchema), gastosController.getGastos);
router.post("/", validar(crearGastoSchema), gastosController.postGasto);
router.patch("/:id", validar(actualizarGastoSchema), gastosController.patchGasto);
// Eliminar borra también el comprobante (respaldo contable): solo SuperAdmin.
router.delete("/:id", requireSuperAdmin, gastosController.deleteGasto);
router.post("/:id/comprobante", validar(comprobanteSchema), gastosController.postComprobante);

export default router;
