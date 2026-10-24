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
// Personas y camiones con los equipos que tienen ahora (pestaña Asignaciones).
router.get("/asignaciones-actuales", equiposController.getAsignacionesActuales);
router.post("/", validar(crearEquipoSchema), equiposController.postEquipo);
router.patch("/:id", validar(actualizarEquipoSchema), equiposController.patchEquipo);
router.delete("/:id", equiposController.deleteEquipo);
router.patch("/:id/fotos", validar(actualizarFotosSchema), equiposController.patchFotos);
router.patch("/:id/estado", validar(patchEstadoEquipoSchema), equiposController.patchEstado);
router.post("/:id/devolver", equiposController.postDevolver);
router.patch("/:id/dar-de-baja", validar(darDeBajaSchema), equiposController.patchDarDeBaja);
router.post("/:id/inspecciones", validar(registrarInspeccionSchema), equiposController.postInspeccion);
router.get("/:id/historial", equiposController.getHistorial);
// Una foto del historial del equipo (inspecciones y cambios de fotos).
router.get("/:id/fotos/:fotoId", equiposController.getFoto);
// Foto actual 1 o 2 del equipo (miniaturas de la pestaña Asignaciones).
router.get("/:id/foto-actual/:posicion", equiposController.getFotoActual);
router.get("/:id/asignaciones", equiposController.getAsignaciones);
// Destinatarios que admite el tipo del equipo, con los que no se pueden elegir y por qué.
router.get("/:id/destinatarios", equiposController.getDestinatarios);

export default router;
