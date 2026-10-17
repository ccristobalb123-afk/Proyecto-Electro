import { z } from "zod";
import { rucValido } from "../lib/ruc.js";

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
  // "sin" = gastos antiguos que todavía no tienen tipo.
  tipo: z.enum(["boleta", "factura", "sin"]).optional(),
});

const camposGasto = z.object({
  empresa: empresaSchema,
  categoria: z.string().trim().min(1, "Selecciona una categoría."),
  monto: montoSchema,
  fecha: fechaSchema,
  proveedor: z.string().trim().optional(),
  trabajador: z.string().trim().optional(),
  descripcion: z.string().trim().optional(),
  tipoComprobante: z.enum(["boleta", "factura"], { errorMap: () => ({ message: "Elige el tipo de comprobante: Boleta o Factura." }) }),
  rucProveedor: z.string().trim().optional(),
  // Del archivo ya subido a /api/uploads (mismo flujo que Contratos y Cursos).
  archivoNombre: z.string().trim().optional(),
  archivoUrl: z.string().trim().optional(),
});

// Factura: el RUC del proveedor es obligatorio y válido. Boleta: no se
// pide (si llega, se descarta en el servicio).
function exigirRucEnFactura(datos, ctx) {
  if (datos.tipoComprobante !== "factura") return;
  if (!datos.rucProveedor) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rucProveedor"], message: "Ingresa el RUC del proveedor: es obligatorio en una factura." });
  } else if (!rucValido(datos.rucProveedor)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rucProveedor"], message: "El RUC del proveedor no es válido: debe tener 11 dígitos y empezar con 10, 15, 16, 17 o 20. Revisa que esté bien escrito." });
  }
}

// Al crear, el documento es obligatorio. Al editar puede no llegar
// (se conserva el que ya tiene); el servicio exige que quede alguno.
export const crearGastoSchema = camposGasto.superRefine((datos, ctx) => {
  exigirRucEnFactura(datos, ctx);
  if (!datos.archivoUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["archivoUrl"], message: "Adjunta la foto o PDF del comprobante: es obligatorio." });
  }
});

export const actualizarGastoSchema = camposGasto.superRefine(exigirRucEnFactura);
