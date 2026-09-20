import { z } from "zod";
import { MODULOS_DISPONIBLES } from "../lib/roles.js";

const empresasSchema = z
  .array(z.enum(["corevex", "electro"]))
  .min(1, "Selecciona al menos una empresa.");

const usuarioSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "El usuario debe tener al menos 3 caracteres.")
  .regex(/^[a-z0-9._-]+$/, "Solo letras, números, puntos, guiones y guion bajo.");

// Ya no hay un "rol" que elegir — se marca directo si es SuperAdmin
// (control total) o, si no, a qué ventanas puntuales tiene acceso.
const datosBaseSchema = {
  usuario: usuarioSchema,
  nombre: z.string().trim().min(2, "Ingresa el nombre completo."),
  correo: z.string().trim().toLowerCase().email("Ingresa un correo válido."),
  esSuperAdmin: z.boolean().optional().default(false),
  modulos: z.array(z.enum(MODULOS_DISPONIBLES)).optional().default([]),
  empresas: empresasSchema,
};

export const crearUsuarioSchema = z.object(datosBaseSchema);
export const actualizarUsuarioSchema = z.object(datosBaseSchema);

export const cambiarEstadoSchema = z.object({
  activo: z.boolean(),
});

// El PATCH /usuarios/:id del frontend manda o el usuario completo
// (editar) o solo { activo } (activar/desactivar) — nunca una mezcla
// de ambos. z.union() prueba los 2 schemas y usa el que sí calce.
export const patchUsuarioSchema = z.union([actualizarUsuarioSchema, cambiarEstadoSchema]);

export const listarUsuariosQuerySchema = z.object({
  q: z.string().trim().optional(),
});
