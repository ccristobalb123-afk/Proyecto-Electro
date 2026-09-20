import * as gastosService from "../services/gastos.service.js";
import { asyncHandler } from "../lib/errors.js";

export const getCategoriasGasto = asyncHandler(async (req, res) => {
  res.json(await gastosService.listarCategoriasGasto());
});

export const postCategoriaGasto = asyncHandler(async (req, res) => {
  const nombre = await gastosService.agregarCategoriaGasto(req.body.nombre);
  res.status(201).json({ nombre });
});

export const patchCategoriaGasto = asyncHandler(async (req, res) => {
  const nombre = await gastosService.actualizarCategoriaGasto(req.params.nombre, req.body.nombre);
  res.json({ nombre });
});

export const deleteCategoriaGasto = asyncHandler(async (req, res) => {
  res.json(await gastosService.eliminarCategoriaGasto(req.params.nombre));
});

export const getGastos = asyncHandler(async (req, res) => {
  res.json(await gastosService.listarGastos(req.query, req.empresasPermitidas));
});

export const postGasto = asyncHandler(async (req, res) => {
  res.status(201).json(await gastosService.crearGasto(req.body, req.empresasPermitidas));
});

export const patchGasto = asyncHandler(async (req, res) => {
  res.json(await gastosService.actualizarGasto(Number(req.params.id), req.body, req.empresasPermitidas));
});

export const deleteGasto = asyncHandler(async (req, res) => {
  res.json(await gastosService.eliminarGasto(Number(req.params.id), req.empresasPermitidas));
});

export const postComprobante = asyncHandler(async (req, res) => {
  res.json(await gastosService.adjuntarComprobanteGasto(Number(req.params.id), req.body.archivoNombre, req.body.archivoUrl, req.empresasPermitidas));
});
