import { Router } from "express";
import * as personalController from "../controllers/personal.controller.js";
import { requireAuth, requireModulo } from "../middleware/auth.middleware.js";
import { validarQuery } from "../middleware/validar.js";
import { listarPersonalQuerySchema } from "../validators/rrhh.validators.js";

const router = Router();

router.use(requireAuth, requireModulo("rrhh"));

router.get("/", validarQuery(listarPersonalQuerySchema), personalController.getPersonal);

export default router;
