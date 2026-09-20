import { Router } from "express";
import * as vehiculosController from "../controllers/vehiculos.controller.js";
import { requireAuth, requireModulo } from "../middleware/auth.middleware.js";
import { validar, validarQuery } from "../middleware/validar.js";
import {
  listarVehiculosQuerySchema,
  crearVehiculoSchema,
  actualizarVehiculoSchema,
  actualizarDocumentoSchema,
} from "../validators/operaciones.validators.js";

const router = Router();

router.use(requireAuth, requireModulo("operaciones"));

router.get("/", validarQuery(listarVehiculosQuerySchema), vehiculosController.getVehiculos);
router.post("/", validar(crearVehiculoSchema), vehiculosController.postVehiculo);
router.patch("/:id", validar(actualizarVehiculoSchema), vehiculosController.patchVehiculo);
router.delete("/:id", vehiculosController.deleteVehiculo);
router.patch("/:id/documentos/:documentoId", validar(actualizarDocumentoSchema), vehiculosController.patchDocumento);
router.get("/:placa/historial", vehiculosController.getHistorial);

export default router;
