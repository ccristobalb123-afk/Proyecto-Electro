import { Router } from "express";
import * as notificacionesController from "../controllers/notificaciones.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validar } from "../middleware/validar.js";
import { suscripcionSchema, desuscribirSchema } from "../validators/notificaciones.validators.js";

const router = Router();

// Pública a propósito: el frontend la necesita ANTES de saber si hay
// sesión (para decidir si mostrar el botón de activar notificaciones).
router.get("/vapid-public-key", notificacionesController.getVapidPublicKey);

router.post("/suscribir", requireAuth, validar(suscripcionSchema), notificacionesController.postSuscribir);
router.post("/desuscribir", requireAuth, validar(desuscribirSchema), notificacionesController.postDesuscribir);

export default router;
