import { Router } from "express";
import * as facturasController from "../controllers/facturas.controller.js";
import { requireAuth, requireModulo } from "../middleware/auth.middleware.js";
import { validar, validarQuery } from "../middleware/validar.js";
import {
  listarConEstadoQuerySchema,
  crearFacturaSchema,
  registrarPagoSchema,
  comprobanteSchema,
} from "../validators/finanzas.validators.js";

const router = Router();

router.use(requireAuth, requireModulo("finanzas"));

router.get("/", validarQuery(listarConEstadoQuerySchema), facturasController.getFacturas);
router.post("/", validar(crearFacturaSchema), facturasController.postFactura);
router.patch("/:id", validar(crearFacturaSchema), facturasController.patchFactura);
router.post("/:id/anular", facturasController.postAnular);
router.post("/:id/pagos", validar(registrarPagoSchema), facturasController.postPago);
router.post("/:id/comprobante", validar(comprobanteSchema), facturasController.postComprobante);

export default router;
