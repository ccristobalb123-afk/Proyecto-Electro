import { z } from "zod";

const empresaSchema = z.enum(["corevex", "electro"]);
const fechaSchema = z.string().refine((v) => !isNaN(Date.parse(v)), "Fecha inválida.");
const montoSchema = z.coerce.number().positive("El monto debe ser mayor a 0.");

export const listarConEstadoQuerySchema = z.object({
  empresa: empresaSchema.optional(),
  estado: z.enum(["pendiente", "parcial", "pagado"]).optional(),
  q: z.string().trim().optional(),
});

// ---- Detracción (compartido por Facturas y Facturas por pagar) ----
const camposDetraccion = {
  catalogoDetraccionId: z.coerce.number().int().positive().optional().nullable(),
  detraccionMedioPago: z.string().trim().optional(),
  detraccionCuentaBn: z.string().trim().optional(),
};

// ---- Facturas ----
export const crearFacturaSchema = z
  .object({
    empresa: empresaSchema,
    cliente: z.string().trim().min(1, "Ingresa el cliente."),
    serie: z.string().trim().min(1, "Ingresa la serie."),
    numero: z.string().trim().min(1, "Ingresa el número."),
    montoTotal: montoSchema,
    fechaEmision: fechaSchema,
    fechaVencimiento: fechaSchema,
    ...camposDetraccion,
  })
  .refine((datos) => new Date(datos.fechaVencimiento) >= new Date(datos.fechaEmision), {
    message: "La fecha de vencimiento no puede ser anterior a la fecha de emisión.",
    path: ["fechaVencimiento"],
  });

export const registrarPagoSchema = z.object({
  monto: montoSchema,
});

export const comprobanteSchema = z.object({
  archivoNombre: z.string().min(1, "Falta el nombre del archivo."),
  archivoUrl: z.string().min(1, "Falta la URL del archivo."),
});

// ---- Facturas por pagar ----
export const crearFacturaPorPagarSchema = z
  .object({
    empresa: empresaSchema,
    proveedor: z.string().trim().min(1, "Ingresa el proveedor."),
    motivo: z.string().trim().min(1, "Ingresa el motivo."),
    montoTotal: montoSchema,
    fechaEmision: fechaSchema,
    fechaVencimiento: fechaSchema,
    ...camposDetraccion,
  })
  .refine((datos) => new Date(datos.fechaVencimiento) >= new Date(datos.fechaEmision), {
    message: "La fecha de vencimiento no puede ser anterior a la fecha de emisión.",
    path: ["fechaVencimiento"],
  });

// ---- Gastos ----
export const listarGastosQuerySchema = z.object({
  empresa: empresaSchema.optional(),
  q: z.string().trim().optional(),
});

export const crearGastoSchema = z.object({
  empresa: empresaSchema,
  categoria: z.string().trim().min(1, "Selecciona una categoría."),
  monto: montoSchema,
  fecha: fechaSchema,
  proveedor: z.string().trim().optional(),
  trabajador: z.string().trim().optional(),
  descripcion: z.string().trim().optional(),
});
