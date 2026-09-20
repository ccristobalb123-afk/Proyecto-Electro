import * as vehiculosService from "../services/vehiculos.service.js";
import { asyncHandler } from "../lib/errors.js";

export const getVehiculos = asyncHandler(async (req, res) => {
  const vehiculos = await vehiculosService.listarVehiculos(req.query, req.empresasPermitidas);
  res.json(vehiculos);
});

export const postVehiculo = asyncHandler(async (req, res) => {
  const nuevo = await vehiculosService.crearVehiculo(req.body, req.empresasPermitidas, req.usuario.id);
  res.status(201).json(nuevo);
});

export const patchVehiculo = asyncHandler(async (req, res) => {
  const vehiculoId = Number(req.params.id);
  const actualizado = await vehiculosService.actualizarVehiculo(vehiculoId, req.body, req.empresasPermitidas, req.usuario.id);
  res.json(actualizado);
});

export const deleteVehiculo = asyncHandler(async (req, res) => {
  const vehiculoId = Number(req.params.id);
  res.json(await vehiculosService.eliminarVehiculo(vehiculoId, req.empresasPermitidas));
});

export const patchDocumento = asyncHandler(async (req, res) => {
  const vehiculoId = Number(req.params.id);
  const documentoId = Number(req.params.documentoId);
  const actualizado = await vehiculosService.actualizarDocumento(vehiculoId, documentoId, req.body, req.empresasPermitidas);
  res.json(actualizado);
});

export const getHistorial = asyncHandler(async (req, res) => {
  const historial = await vehiculosService.obtenerHistorial(req.params.placa, req.empresasPermitidas);
  res.json(historial);
});
