import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/kpis", dashboardController.getKpis);
router.get("/alertas", dashboardController.getAlertas);
router.get("/actividad-reciente", dashboardController.getActividadReciente);
router.get("/comparativo", dashboardController.getComparativo);

export default router;
