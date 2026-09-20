import { z } from "zod";

const ESTADOS = ["vigente", "porvencer", "vencido", "renovado", "terminado"];
const fechaSchema = z.string().refine((v) => !isNaN(Date.parse(v)), "Fecha inválida.");
const dniSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, "El DNI debe tener 8 dígitos.");

export const listarConFiltrosQuerySchema = z.object({
  empresa: z.enum(["corevex", "electro"]).optional(),
  estado: z.enum(ESTADOS).optional(),
  q: z.string().trim().optional(),
});

export const crearContratoSchema = z
  .object({
    dni: dniSchema,
    trabajador: z.string().trim().min(2, "Ingresa el nombre del trabajador."),
    empresa: z.enum(["corevex", "electro"]),
    tipo: z.enum(["Plazo fijo", "Indefinido"]),
    fechaInicio: fechaSchema,
    fechaFin: fechaSchema,
    diasAnticipacion: z.number().int().positive().optional(),
    archivoNombre: z.string().optional(),
    archivoUrl: z.string().optional(),
  })
  .refine((datos) => new Date(datos.fechaFin) >= new Date(datos.fechaInicio), {
    message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
    path: ["fechaFin"],
  });

export const adjuntarArchivoSchema = z.object({
  archivoNombre: z.string().min(1, "Falta el nombre del archivo."),
  archivoUrl: z.string().min(1, "Falta la URL del archivo."),
});

export const crearCursoSchema = z
  .object({
    dni: dniSchema,
    empresa: z.enum(["corevex", "electro"]),
    tipo: z.enum(["Curso", "Fotocheck", "EMO"]),
    fechaInicio: fechaSchema,
    fechaVencimiento: fechaSchema,
    diasAnticipacion: z.number().int().positive().optional(),
  })
  .refine((datos) => new Date(datos.fechaVencimiento) >= new Date(datos.fechaInicio), {
    message: "La fecha de vencimiento no puede ser anterior a la fecha de inicio.",
    path: ["fechaVencimiento"],
  });

export const listarPersonalQuerySchema = z.object({
  q: z.string().trim().optional(),
});
