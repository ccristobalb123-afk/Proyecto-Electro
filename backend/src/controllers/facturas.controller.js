import * as facturasService from "../services/facturas.service.js";
import { asyncHandler } from "../lib/errors.js";

// ---- Facturas (por cobrar) ----
export const getFacturas = asyncHandler(async (req, res) => {
  res.json(await facturasService.listarFacturas(req.query, req.empresasPermitidas));
});

export const postFactura = asyncHandler(async (req, res) => {
  res.status(201).json(await facturasService.crearFactura(req.body, req.empresasPermitidas));
});

export const patchFactura = asyncHandler(async (req, res) => {
  res.json(await facturasService.actualizarFactura(Number(req.params.id), req.body, req.empresasPermitidas));
});

export const postAnular = asyncHandler(async (req, res) => {
  res.json(await facturasService.anularFactura(Number(req.params.id), req.empresasPermitidas));
});

export const postPago = asyncHandler(async (req, res) => {
  res.json(await facturasService.registrarPagoFactura(Number(req.params.id), req.body.monto, req.empresasPermitidas));
});

export const postComprobante = asyncHandler(async (req, res) => {
  res.json(
    await facturasService.adjuntarComprobanteFactura(Number(req.params.id), req.body.archivoNombre, req.body.archivoUrl, req.empresasPermitidas)
  );
});

// ---- Facturas por pagar ----
export const getFacturasPorPagar = asyncHandler(async (req, res) => {
  res.json(await facturasService.listarFacturasPorPagar(req.query, req.empresasPermitidas));
});

export const postFacturaPorPagar = asyncHandler(async (req, res) => {
  res.status(201).json(await facturasService.crearFacturaPorPagar(req.body, req.empresasPermitidas));
});

export const patchFacturaPorPagar = asyncHandler(async (req, res) => {
  res.json(await facturasService.actualizarFacturaPorPagar(Number(req.params.id), req.body, req.empresasPermitidas));
});

export const postPagoPorPagar = asyncHandler(async (req, res) => {
  res.json(await facturasService.registrarPagoFacturaPorPagar(Number(req.params.id), req.body.monto, req.empresasPermitidas));
});

export const postAnularPorPagar = asyncHandler(async (req, res) => {
  res.json(await facturasService.anularFacturaPorPagar(Number(req.params.id), req.empresasPermitidas));
});

export const postComprobantePorPagar = asyncHandler(async (req, res) => {
  res.json(
    await facturasService.adjuntarComprobanteFacturaPorPagar(
      Number(req.params.id),
      req.body.archivoNombre,
      req.body.archivoUrl,
      req.empresasPermitidas
    )
  );
});
