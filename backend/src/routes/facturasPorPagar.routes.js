import { Router } from "express";
import * as facturasController from "../controllers/facturas.controller.js";
import { requireAuth, requireModulo } from "../middleware/auth.middleware.js";
import { validar, validarQuery } from "../middleware/validar.js";
import {
  listarConEstadoQuerySchema,
  crearFacturaPorPagarSchema,
  registrarPagoSchema,
  comprobanteSchema,
} from "../validators/finanzas.validators.js";

const router = Router();

router.use(requireAuth, requireModulo("finanzas"));

router.get("/", validarQuery(listarConEstadoQuerySchema), facturasController.getFacturasPorPagar);
router.post("/", validar(crearFacturaPorPagarSchema), facturasController.postFacturaPorPagar);
router.patch("/:id", validar(crearFacturaPorPagarSchema), facturasController.patchFacturaPorPagar);
router.post("/:id/anular", facturasController.postAnularPorPagar);
router.post("/:id/pagos", validar(registrarPagoSchema), facturasController.postPagoPorPagar);
router.post("/:id/comprobante", validar(comprobanteSchema), facturasController.postComprobantePorPagar);

export default router;
