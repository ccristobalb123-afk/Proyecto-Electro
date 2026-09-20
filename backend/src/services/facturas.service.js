import { db, transaccionSerializable } from "../lib/db.js";
import { totalPagado, calcularEstadoPago, montoNetoAPagar } from "../lib/estadoPago.js";
import { ApiError, validacionFallida, sinPermiso } from "../lib/errors.js";
import { empresasParaFiltro, verificarAccesoEmpresa } from "../lib/autorizacionEmpresa.js";

function fecha(v) {
  return v.toISOString().slice(0, 10); // "2026-08-02" — mismo formato que ya usaba el mock
}

function serializarDetraccion(f) {
  return {
    catalogoDetraccion: f.catalogoDetraccion
      ? {
          id: f.catalogoDetraccion.id,
          codigo: f.catalogoDetraccion.codigo,
          descripcion: f.catalogoDetraccion.descripcion,
          porcentaje: Number(f.catalogoDetraccion.porcentaje),
        }
      : null,
    montoDetraccion: f.montoDetraccion != null ? Number(f.montoDetraccion) : null,
    detraccionMedioPago: f.detraccionMedioPago || null,
    detraccionCuentaBn: f.detraccionCuentaBn || null,
  };
}

// Resuelve el código de detracción elegido en el formulario contra el
// catálogo y calcula el monto — se hace acá (no en el frontend) porque
// el % es el que vale al momento de GUARDAR, no el que el navegador
// tenía cacheado. Devuelve null en ambos si la factura no aplica
// detracción, para no dejar un montoDetraccion huérfano sin catálogo.
async function resolverDetraccion(catalogoDetraccionId, montoTotal) {
  if (!catalogoDetraccionId) return { catalogoDetraccionId: null, montoDetraccion: null };

  const catalogo = await db.catalogoDetraccion.findUnique({ where: { id: catalogoDetraccionId } });
  if (!catalogo) throw validacionFallida("El código de detracción no existe.");

  const hoy = new Date();
  if (catalogo.vigenteHasta && catalogo.vigenteHasta < hoy) {
    throw validacionFallida(`El código ${catalogo.codigo} (${catalogo.descripcion}) ya no está vigente.`);
  }

  const montoDetraccion = Math.round(Number(montoTotal) * Number(catalogo.porcentaje) * 100) / 100;
  return { catalogoDetraccionId, montoDetraccion };
}

// ---------------- Facturas (por cobrar) ----------------

function serializarFactura(f) {
  return {
    id: f.id,
    empresa: f.empresa.slug,
    cliente: f.cliente,
    serie: f.serie,
    numero: f.numero,
    montoTotal: Number(f.montoTotal),
    fechaEmision: fecha(f.fechaEmision),
    fechaVencimiento: fecha(f.fechaVencimiento),
    pagos: f.pagos.map((p) => ({ monto: Number(p.monto), fecha: fecha(p.fecha) })),
    ...serializarDetraccion(f),
    archivo: !!f.archivoNombre,
    ...(f.archivoUrl ? { archivoUrl: f.archivoUrl } : {}),
    anulada: f.anulada,
  };
}

async function buscarEmpresa(slug, empresasPermitidas) {
  verificarAccesoEmpresa(slug, empresasPermitidas);
  const empresa = await db.empresa.findUnique({ where: { slug } });
  if (!empresa) throw validacionFallida("Empresa inválida.");
  return empresa;
}

const includeFactura = { empresa: true, pagos: true, catalogoDetraccion: true };

export async function listarFacturas({ empresa, estado, q }, empresasPermitidas) {
  const empresasFiltro = empresasParaFiltro(empresa, empresasPermitidas);
  const facturas = await db.factura.findMany({
    where: {
      empresa: { slug: { in: empresasFiltro } },
      ...(q ? { cliente: { contains: q, mode: "insensitive" } } : {}),
    },
    include: includeFactura,
    orderBy: { creadoEn: "desc" },
  });
  let resultado = facturas.map(serializarFactura);
  if (estado) {
    resultado = resultado.filter(
      (f) => calcularEstadoPago(montoNetoAPagar(f.montoTotal, f.montoDetraccion), f.pagos) === estado
    );
  }
  return resultado;
}

export async function crearFactura(datos, empresasPermitidas) {
  const empresaRow = await buscarEmpresa(datos.empresa, empresasPermitidas);

  const yaExiste = await db.factura.findUnique({
    where: { empresaId_serie_numero: { empresaId: empresaRow.id, serie: datos.serie.trim(), numero: datos.numero.trim() } },
  });
  if (yaExiste) throw new ApiError(409, "FACTURA_DUPLICADA", "Ya existe una factura con esa serie y número para esta empresa.");

  const { catalogoDetraccionId, montoDetraccion } = await resolverDetraccion(datos.catalogoDetraccionId, datos.montoTotal);

  const creada = await db.factura.create({
    data: {
      empresaId: empresaRow.id,
      cliente: datos.cliente.trim(),
      serie: datos.serie.trim(),
      numero: datos.numero.trim(),
      montoTotal: datos.montoTotal,
      fechaEmision: new Date(datos.fechaEmision),
      fechaVencimiento: new Date(datos.fechaVencimiento),
      catalogoDetraccionId,
      montoDetraccion,
      detraccionMedioPago: datos.detraccionMedioPago?.trim() || null,
      detraccionCuentaBn: datos.detraccionCuentaBn?.trim() || null,
    },
    include: includeFactura,
  });
  return serializarFactura(creada);
}

async function buscarFactura(facturaId, empresasPermitidas) {
  const factura = await db.factura.findUnique({ where: { id: facturaId }, include: includeFactura });
  if (!factura) throw new ApiError(404, "NO_ENCONTRADO", "La factura no existe.");
  if (!empresasPermitidas.includes(factura.empresa.slug)) throw sinPermiso();
  return factura;
}

export async function actualizarFactura(facturaId, datos, empresasPermitidas) {
  const factura = await buscarFactura(facturaId, empresasPermitidas);
  const empresaRow = await buscarEmpresa(datos.empresa, empresasPermitidas);

  // No se puede bajar el total por debajo de lo que ya se cobró — si
  // hoy tiene S/ 8,000 pagados, el total no puede terminar en S/ 5,000,
  // quedaría "pagado de más" sin sentido.
  const pagado = totalPagado(factura.pagos);
  if (Number(datos.montoTotal) < pagado) {
    throw validacionFallida(`El monto no puede ser menor a lo ya pagado (S/ ${pagado.toFixed(2)}).`);
  }

  const { catalogoDetraccionId, montoDetraccion } = await resolverDetraccion(datos.catalogoDetraccionId, datos.montoTotal);

  const actualizada = await db.factura.update({
    where: { id: facturaId },
    data: {
      empresaId: empresaRow.id,
      cliente: datos.cliente.trim(),
      serie: datos.serie.trim(),
      numero: datos.numero.trim(),
      montoTotal: datos.montoTotal,
      fechaEmision: new Date(datos.fechaEmision),
      fechaVencimiento: new Date(datos.fechaVencimiento),
      catalogoDetraccionId,
      montoDetraccion,
      detraccionMedioPago: datos.detraccionMedioPago?.trim() || null,
      detraccionCuentaBn: datos.detraccionCuentaBn?.trim() || null,
    },
    include: includeFactura,
  });
  return serializarFactura(actualizada);
}

export async function anularFactura(facturaId, empresasPermitidas) {
  const factura = await buscarFactura(facturaId, empresasPermitidas);
  // Si ya tiene pagos registrados, anular así nomás dejaría plata cobrada
  // "flotando" sin factura asociada — en ese caso hace falta una nota de
  // crédito, no un simple anular.
  if (totalPagado(factura.pagos) > 0) {
    throw validacionFallida("Esta factura ya tiene pagos registrados — no se puede anular directamente, se necesita una nota de crédito.");
  }
  const actualizada = await db.factura.update({
    where: { id: facturaId },
    data: { anulada: true },
    include: includeFactura,
  });
  return serializarFactura(actualizada);
}

// Serializable + reintento: si 2 personas registran un pago de la
// misma factura casi al mismo tiempo, sin esto ambas podrían leer "aún
// debe S/ 1000" y las dos pagar S/ 700 — quedaría pagado de más sin que
// ninguna lo note. Con esto, la segunda transacción que intente pisar
// lo que la primera ya leyó se reintenta desde cero (vuelve a leer el
// saldo YA actualizado) en vez de aceptarse a ciegas.
export async function registrarPagoFactura(facturaId, monto, empresasPermitidas) {
  return transaccionSerializable(async (tx) => {
    const factura = await tx.factura.findUnique({ where: { id: facturaId }, include: { empresa: true, pagos: true } });
    if (!factura) throw new ApiError(404, "NO_ENCONTRADO", "La factura no existe.");
    if (!empresasPermitidas.includes(factura.empresa.slug)) throw sinPermiso();
    if (factura.anulada) throw validacionFallida("No se puede registrar un pago sobre una factura anulada.");

    const neto = montoNetoAPagar(factura.montoTotal, factura.montoDetraccion);
    const saldo = neto - totalPagado(factura.pagos);
    if (monto > saldo) {
      throw validacionFallida(`El pago no puede ser mayor al saldo pendiente (S/ ${saldo.toFixed(2)}).`);
    }

    await tx.pagoFactura.create({ data: { facturaId, monto } });
    const actualizada = await tx.factura.findUnique({ where: { id: facturaId }, include: includeFactura });
    return serializarFactura(actualizada);
  });
}

// ---------------- Facturas por pagar ----------------

function serializarFacturaPorPagar(f) {
  return {
    id: f.id,
    empresa: f.empresa.slug,
    proveedor: f.proveedor,
    motivo: f.motivo,
    montoTotal: Number(f.montoTotal),
    fechaEmision: fecha(f.fechaEmision),
    fechaVencimiento: fecha(f.fechaVencimiento),
    pagos: f.pagos.map((p) => ({ monto: Number(p.monto), fecha: fecha(p.fecha) })),
    ...serializarDetraccion(f),
    archivo: !!f.archivoNombre,
    ...(f.archivoUrl ? { archivoUrl: f.archivoUrl } : {}),
    anulada: f.anulada,
  };
}

const includeFacturaPorPagar = { empresa: true, pagos: true, catalogoDetraccion: true };

export async function listarFacturasPorPagar({ empresa, estado, q }, empresasPermitidas) {
  const empresasFiltro = empresasParaFiltro(empresa, empresasPermitidas);
  const facturas = await db.facturaPorPagar.findMany({
    where: {
      empresa: { slug: { in: empresasFiltro } },
      ...(q ? { proveedor: { contains: q, mode: "insensitive" } } : {}),
    },
    include: includeFacturaPorPagar,
    orderBy: { creadoEn: "desc" },
  });
  let resultado = facturas.map(serializarFacturaPorPagar);
  if (estado) {
    resultado = resultado.filter(
      (f) => calcularEstadoPago(montoNetoAPagar(f.montoTotal, f.montoDetraccion), f.pagos) === estado
    );
  }
  return resultado;
}

export async function crearFacturaPorPagar(datos, empresasPermitidas) {
  const empresaRow = await buscarEmpresa(datos.empresa, empresasPermitidas);
  const { catalogoDetraccionId, montoDetraccion } = await resolverDetraccion(datos.catalogoDetraccionId, datos.montoTotal);

  const creada = await db.facturaPorPagar.create({
    data: {
      empresaId: empresaRow.id,
      proveedor: datos.proveedor.trim(),
      motivo: datos.motivo.trim(),
      montoTotal: datos.montoTotal,
      fechaEmision: new Date(datos.fechaEmision),
      fechaVencimiento: new Date(datos.fechaVencimiento),
      catalogoDetraccionId,
      montoDetraccion,
      detraccionMedioPago: datos.detraccionMedioPago?.trim() || null,
      detraccionCuentaBn: datos.detraccionCuentaBn?.trim() || null,
    },
    include: includeFacturaPorPagar,
  });
  return serializarFacturaPorPagar(creada);
}

async function buscarFacturaPorPagar(facturaId, empresasPermitidas) {
  const factura = await db.facturaPorPagar.findUnique({ where: { id: facturaId }, include: includeFacturaPorPagar });
  if (!factura) throw new ApiError(404, "NO_ENCONTRADO", "La factura por pagar no existe.");
  if (!empresasPermitidas.includes(factura.empresa.slug)) throw sinPermiso();
  return factura;
}

export async function actualizarFacturaPorPagar(facturaId, datos, empresasPermitidas) {
  const factura = await buscarFacturaPorPagar(facturaId, empresasPermitidas);
  const empresaRow = await buscarEmpresa(datos.empresa, empresasPermitidas);

  const pagado = totalPagado(factura.pagos);
  if (Number(datos.montoTotal) < pagado) {
    throw validacionFallida(`El monto no puede ser menor a lo ya pagado (S/ ${pagado.toFixed(2)}).`);
  }

  const { catalogoDetraccionId, montoDetraccion } = await resolverDetraccion(datos.catalogoDetraccionId, datos.montoTotal);

  const actualizada = await db.facturaPorPagar.update({
    where: { id: facturaId },
    data: {
      empresaId: empresaRow.id,
      proveedor: datos.proveedor.trim(),
      motivo: datos.motivo.trim(),
      montoTotal: datos.montoTotal,
      fechaEmision: new Date(datos.fechaEmision),
      fechaVencimiento: new Date(datos.fechaVencimiento),
      catalogoDetraccionId,
      montoDetraccion,
      detraccionMedioPago: datos.detraccionMedioPago?.trim() || null,
      detraccionCuentaBn: datos.detraccionCuentaBn?.trim() || null,
    },
    include: includeFacturaPorPagar,
  });
  return serializarFacturaPorPagar(actualizada);
}

export async function anularFacturaPorPagar(facturaId, empresasPermitidas) {
  const factura = await buscarFacturaPorPagar(facturaId, empresasPermitidas);
  // Mismo criterio que con Factura: si ya se le pagó algo al proveedor,
  // anular así nomás dejaría ese pago "flotando" sin nada asociado.
  if (totalPagado(factura.pagos) > 0) {
    throw validacionFallida("Esta factura ya tiene pagos registrados — no se puede anular directamente.");
  }
  const actualizada = await db.facturaPorPagar.update({
    where: { id: facturaId },
    data: { anulada: true },
    include: includeFacturaPorPagar,
  });
  return serializarFacturaPorPagar(actualizada);
}

export async function registrarPagoFacturaPorPagar(facturaId, monto, empresasPermitidas) {
  return transaccionSerializable(async (tx) => {
    const factura = await tx.facturaPorPagar.findUnique({ where: { id: facturaId }, include: { empresa: true, pagos: true } });
    if (!factura) throw new ApiError(404, "NO_ENCONTRADO", "La factura por pagar no existe.");
    if (!empresasPermitidas.includes(factura.empresa.slug)) throw sinPermiso();
    if (factura.anulada) throw validacionFallida("No se puede registrar un pago sobre una factura anulada.");

    const neto = montoNetoAPagar(factura.montoTotal, factura.montoDetraccion);
    const saldo = neto - totalPagado(factura.pagos);
    if (monto > saldo) {
      throw validacionFallida(`El pago no puede ser mayor al saldo pendiente (S/ ${saldo.toFixed(2)}).`);
    }

    await tx.pagoFacturaPorPagar.create({ data: { facturaPorPagarId: facturaId, monto } });
    const actualizada = await tx.facturaPorPagar.findUnique({ where: { id: facturaId }, include: includeFacturaPorPagar });
    return serializarFacturaPorPagar(actualizada);
  });
}

// ---------------- Comprobantes ----------------

export async function adjuntarComprobanteFactura(facturaId, archivoNombre, archivoUrl, empresasPermitidas) {
  await buscarFactura(facturaId, empresasPermitidas);
  const actualizada = await db.factura.update({
    where: { id: facturaId },
    data: { archivoNombre, archivoUrl },
    include: includeFactura,
  });
  return serializarFactura(actualizada);
}

export async function adjuntarComprobanteFacturaPorPagar(facturaId, archivoNombre, archivoUrl, empresasPermitidas) {
  await buscarFacturaPorPagar(facturaId, empresasPermitidas);
  const actualizada = await db.facturaPorPagar.update({
    where: { id: facturaId },
    data: { archivoNombre, archivoUrl },
    include: includeFacturaPorPagar,
  });
  return serializarFacturaPorPagar(actualizada);
}
