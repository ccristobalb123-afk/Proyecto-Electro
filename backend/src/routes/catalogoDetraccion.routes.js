import { Router } from "express";
import * as catalogoDetraccionController from "../controllers/catalogoDetraccion.controller.js";
import { requireAuth, requireModulo } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireModulo("finanzas"));
router.get("/", catalogoDetraccionController.getCatalogoDetraccion);

export default router;
