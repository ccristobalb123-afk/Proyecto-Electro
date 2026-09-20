import { Router } from "express";
import * as equiposController from "../controllers/equipos.controller.js";
import { requireAuth, requireModulo } from "../middleware/auth.middleware.js";
import { validar, validarQuery } from "../middleware/validar.js";
import {
  listarEquiposQuerySchema,
  crearEquipoSchema,
  actualizarEquipoSchema,
  actualizarFotosSchema,
  patchEstadoEquipoSchema,
  darDeBajaSchema,
  registrarInspeccionSchema,
} from "../validators/operaciones.validators.js";

const router = Router();

router.use(requireAuth, requireModulo("operaciones"));

router.get("/", validarQuery(listarEquiposQuerySchema), equiposController.getEquipos);
router.post("/", validar(crearEquipoSchema), equiposController.postEquipo);
router.patch("/:id", validar(actualizarEquipoSchema), equiposController.patchEquipo);
router.delete("/:id", equiposController.deleteEquipo);
router.patch("/:id/fotos", validar(actualizarFotosSchema), equiposController.patchFotos);
router.patch("/:id/estado", validar(patchEstadoEquipoSchema), equiposController.patchEstado);
router.patch("/:id/dar-de-baja", validar(darDeBajaSchema), equiposController.patchDarDeBaja);
router.post("/:id/inspecciones", validar(registrarInspeccionSchema), equiposController.postInspeccion);
router.get("/:codigo/historial", equiposController.getHistorial);

export default router;
