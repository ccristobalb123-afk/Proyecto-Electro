import * as contratosService from "../services/contratos.service.js";
import { asyncHandler } from "../lib/errors.js";

export const getContratos = asyncHandler(async (req, res) => {
  const contratos = await contratosService.listarContratos(req.query, req.empresasPermitidas);
  res.json(contratos);
});

export const postContrato = asyncHandler(async (req, res) => {
  const nuevo = await contratosService.crearContrato(req.body, req.empresasPermitidas);
  res.status(201).json(nuevo);
});

export const patchContrato = asyncHandler(async (req, res) => {
  const contratoId = Number(req.params.id);
  const actualizado = await contratosService.actualizarContrato(contratoId, req.body, req.empresasPermitidas);
  res.json(actualizado);
});

export const postDocumento = asyncHandler(async (req, res) => {
  const contratoId = Number(req.params.id);
  const actualizado = await contratosService.adjuntarArchivoContrato(
    contratoId,
    req.body.archivoNombre,
    req.body.archivoUrl,
    req.empresasPermitidas
  );
  res.json(actualizado);
});

export const deleteContrato = asyncHandler(async (req, res) => {
  const contratoId = Number(req.params.id);
  res.json(await contratosService.eliminarContrato(contratoId, req.empresasPermitidas));
});
