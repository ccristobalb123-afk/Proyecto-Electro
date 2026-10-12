import { z } from "zod";
import { CLAVES_DOCUMENTO } from "../lib/documentosVehiculo.js";

const empresaSchema = z.enum(["corevex", "electro"]);

// ---- Categorías de equipo ----
export const agregarCategoriaSchema = z.object({
  nombre: z.string().trim().min(2, "Ponle un nombre a la categoría."),
  campos: z
    .array(z.object({ nombre: z.string(), placeholder: z.string().optional() }))
    .min(1, "Agrega al menos un campo."),
});

// ---- Equipos ----
export const listarEquiposQuerySchema = z.object({
  empresa: empresaSchema.optional(),
  categoria: z.string().optional(),
  estado: z.enum(["disponible", "asignado", "mantenimiento", "vencido", "debaja"]).optional(),
  q: z.string().trim().optional(),
});

export const crearEquipoSchema = z.object({
  codigo: z.string().trim().min(1, "Ingresa un código."),
  categoria: z.string().min(1, "Selecciona una categoría."),
  empresa: empresaSchema,
  camposValores: z.record(z.string(), z.string()).optional(),
  fotos: z.array(z.string().nullable()).max(2, "Máximo 2 fotos.").optional(),
});

// Editar NO incluye "empresa" a propósito — cambiarle de empresa a un
// equipo ya existente (con historial, posiblemente asignado a un
// camión de esa empresa) es un cambio de negocio distinto, no una
// simple corrección de datos.
export const actualizarEquipoSchema = z.object({
  codigo: z.string().trim().min(1, "Ingresa un código."),
  categoria: z.string().min(1, "Selecciona una categoría."),
  camposValores: z.record(z.string(), z.string()).optional(),
});

export const actualizarFotosSchema = z.object({
  fotos: z.array(z.string().nullable()).max(2, "Máximo 2 fotos."),
});

export const cambiarEstadoSchema = z.object({
  estado: z.enum(["disponible", "asignado", "mantenimiento", "vencido", "debaja"]),
});

export const asignarEquipoSchema = z.object({
  estado: z.literal("asignado"),
  vehiculoId: z.number().int(),
});

export const mantenimientoEquipoSchema = z.object({
  estado: z.literal("mantenimiento"),
  comentario: z.string().trim().min(1, "Cuenta qué tiene el equipo."),
});

export const darDeBajaSchema = z.object({
  motivo: z.string().trim().min(1, "Ingresa el motivo de la baja."),
});

// El PATCH /equipos/:id/estado llega con 1 de 3 formas distintas según
// a qué estado se quiere pasar — z.union() prueba las 3 y usa la que
// calce, así el controller no tiene que adivinar a mano cuál validar.
export const patchEstadoEquipoSchema = z.union([
  asignarEquipoSchema,
  mantenimientoEquipoSchema,
  cambiarEstadoSchema,
]);

export const registrarInspeccionSchema = z.object({
  tipo: z.enum(["interna", "externa"]),
  fechaInspeccion: z.string().refine((v) => !isNaN(Date.parse(v)), "Fecha inválida."),
  fechaVencimiento: z.string().refine((v) => !isNaN(Date.parse(v)), "Fecha inválida."),
  diasAnticipacion: z.number().int().positive().optional(),
  resultado: z.enum(["aprobado", "observado", "rechazado"]),
});

// ---- Vehículos ----
export const listarVehiculosQuerySchema = z.object({
  empresa: empresaSchema.optional(),
  tipoUnidad: z.enum(["Camioneta", "Camión", "Minivan", "Grúa", "Auto"]).optional(),
  q: z.string().trim().optional(),
});

// ---- Documentos de vehículo ----
const fechaOpcional = z
  .string()
  .trim()
  .refine((v) => v === "" || !isNaN(Date.parse(v)), "Fecha inválida.")
  .transform((v) => v || null)
  .nullable()
  .optional();

const camposFechasDocumento = {
  fechaEmision: fechaOpcional,
  fechaVencimiento: fechaOpcional,
  diasAnticipacion: z
    .number({ invalid_type_error: "Los días de anticipación deben ser un número." })
    .int("Los días de anticipación deben ser un número entero.")
    .min(1, "Los días de anticipación deben estar entre 1 y 365.")
    .max(365, "Los días de anticipación deben estar entre 1 y 365.")
    .optional(),
};

function vencimientoNoAnterior(d, ctx, prefijo = []) {
  if (d.fechaEmision && d.fechaVencimiento && new Date(d.fechaVencimiento) < new Date(d.fechaEmision)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...prefijo, "fechaVencimiento"],
      message: "La fecha de vencimiento no puede ser anterior a la de inspección o emisión.",
    });
  }
}

const documentoVehiculoSchema = z
  .object({
    tipo: z.enum(CLAVES_DOCUMENTO, { errorMap: () => ({ message: "Tipo de documento inválido." }) }),
    ...camposFechasDocumento,
    archivoNombre: z.string().min(1).optional(),
    archivoUrl: z.string().regex(/^\/api\/uploads\/[\w.-]+$/, "Archivo inválido.").optional(),
  })
  .superRefine((d, ctx) => vencimientoNoAnterior(d, ctx));

const listaDocumentosSchema = z.array(documentoVehiculoSchema).superRefine((docs, ctx) => {
  const vistos = new Set();
  docs.forEach((d, i) => {
    if (vistos.has(d.tipo)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i, "tipo"], message: "No se puede repetir el mismo documento en un vehículo." });
    }
    vistos.add(d.tipo);
  });
});

export const crearVehiculoSchema = z.object({
  placa: z.string().trim().min(1, "Ingresa la placa."),
  tipoUnidad: z.enum(["Camioneta", "Camión", "Minivan", "Grúa", "Auto"]),
  empresa: empresaSchema,
  cuadrilla: z.string().trim().optional(),
  documentos: listaDocumentosSchema.default([]),
});

// Sin tipoUnidad ni empresa a propósito — ver el comentario en
// actualizarVehiculo (vehiculos.service.js) sobre por qué esos 2 no se
// editan una vez creado el vehículo. `documentos` es la lista COMPLETA
// de los que aplican: los del catálogo que no vengan se quitan. Si no
// se manda, los documentos no se tocan.
export const actualizarVehiculoSchema = z.object({
  placa: z.string().trim().min(1, "Ingresa la placa."),
  cuadrilla: z.string().trim().optional(),
  documentos: listaDocumentosSchema.optional(),
});

// Adjuntar el archivo o corregir fechas de UN documento (desde el
// modal "Documentos"). Funciona también con los del sistema anterior.
export const actualizarDocumentoSchema = z
  .object({
    archivoNombre: z.string().min(1).optional(),
    archivoUrl: z.string().regex(/^\/api\/uploads\/[\w.-]+$/, "Archivo inválido.").optional(),
    ...camposFechasDocumento,
  })
  .superRefine((d, ctx) => vencimientoNoAnterior(d, ctx));
