import { Router } from "express";
import * as contratosController from "../controllers/contratos.controller.js";
import { requireAuth, requireModulo } from "../middleware/auth.middleware.js";
import { validar, validarQuery } from "../middleware/validar.js";
import {
  listarConFiltrosQuerySchema,
  crearContratoSchema,
  adjuntarArchivoSchema,
} from "../validators/rrhh.validators.js";

const router = Router();

router.use(requireAuth, requireModulo("rrhh"));

router.get("/", validarQuery(listarConFiltrosQuerySchema), contratosController.getContratos);
router.post("/", validar(crearContratoSchema), contratosController.postContrato);
router.patch("/:id", validar(crearContratoSchema), contratosController.patchContrato);
router.delete("/:id", contratosController.deleteContrato);
router.post("/:id/documento", validar(adjuntarArchivoSchema), contratosController.postDocumento);

export default router;
