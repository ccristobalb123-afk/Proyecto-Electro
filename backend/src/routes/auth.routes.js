import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validar } from "../middleware/validar.js";
import { limiteLogin, limiteMfa, limiteRecuperarPassword } from "../middleware/rateLimit.js";
import {
  loginSchema,
  verificarMfaSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  cambiarPasswordSchema,
} from "../validators/auth.validators.js";

const router = Router();

// Públicas
router.post("/login", limiteLogin, validar(loginSchema), authController.postLogin);
router.post("/verify-mfa", limiteMfa, validar(verificarMfaSchema), authController.postVerifyMfa);
router.get("/mfa-setup", authController.getMfaSetup);
router.post("/forgot-password", limiteRecuperarPassword, validar(forgotPasswordSchema), authController.postForgotPassword);
router.post("/reset-password", validar(resetPasswordSchema), authController.postResetPassword);
router.post("/refresh", authController.postRefresh);
router.post("/logout", authController.postLogout);

// Requieren sesión activa
router.get("/me", requireAuth, authController.getMe);
router.post("/cambiar-password", requireAuth, validar(cambiarPasswordSchema), authController.postCambiarPassword);

export default router;
