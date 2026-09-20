import { z } from "zod";

export const loginSchema = z.object({
  usuario: z.string().trim().toLowerCase().min(1, "Ingresa tu usuario."),
  clave: z.string().min(1, "Ingresa tu contraseña."),
});

export const verificarMfaSchema = z.object({
  mfaToken: z.string().min(1, "Falta el token de verificación — vuelve a iniciar sesión."),
  codigo: z
    .string()
    .transform((c) => c.replace(/\s/g, ""))
    .refine((c) => /^\d{6}$/.test(c), "El código debe tener 6 dígitos."),
});

export const forgotPasswordSchema = z.object({
  correo: z.string().trim().email("Ingresa un correo válido."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  passwordNueva: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1, "Ingresa tu contraseña actual."),
  passwordNueva: z.string().min(8, "La contraseña nueva debe tener al menos 8 caracteres."),
});
