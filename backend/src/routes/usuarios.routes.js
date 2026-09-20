import { Router } from "express";
import * as usuariosController from "../controllers/usuarios.controller.js";
import { requireAuth, requireModulo } from "../middleware/auth.middleware.js";
import { validar, validarQuery } from "../middleware/validar.js";
import {
  crearUsuarioSchema,
  patchUsuarioSchema,
  listarUsuariosQuerySchema,
} from "../validators/usuarios.validators.js";

const router = Router();

// Todo este módulo es exclusivo de Administración — solo un rol con
// "administracion" en su lista de módulos (ver lib/roles.js) pasa
// este chequeo, sin importar lo que el frontend deje o no ver en la UI.
router.use(requireAuth, requireModulo("administracion"));

router.get("/", validarQuery(listarUsuariosQuerySchema), usuariosController.getUsuarios);
router.post("/", validar(crearUsuarioSchema), usuariosController.postUsuario);
router.patch("/:id", validar(patchUsuarioSchema), usuariosController.patchUsuario);
router.post("/:id/reset-password", usuariosController.postResetPassword);

export default router;
