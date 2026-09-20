import { Router } from "express";
import * as cursosController from "../controllers/cursos.controller.js";
import { requireAuth, requireModulo } from "../middleware/auth.middleware.js";
import { validar, validarQuery } from "../middleware/validar.js";
import { listarConFiltrosQuerySchema, crearCursoSchema } from "../validators/rrhh.validators.js";

const router = Router();

router.use(requireAuth, requireModulo("rrhh"));

router.get("/", validarQuery(listarConFiltrosQuerySchema), cursosController.getCursos);
router.post("/", validar(crearCursoSchema), cursosController.postCurso);
router.patch("/:id", validar(crearCursoSchema), cursosController.patchCurso);
router.delete("/:id", cursosController.deleteCurso);

export default router;
