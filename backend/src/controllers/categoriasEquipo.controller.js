import * as categoriasService from "../services/categoriasEquipo.service.js";
import { asyncHandler } from "../lib/errors.js";

export const getCategorias = asyncHandler(async (req, res) => {
  res.json(await categoriasService.listarCategorias());
});

export const getGestion = asyncHandler(async (req, res) => {
  res.json(await categoriasService.listarParaGestion());
});

export const postTipo = asyncHandler(async (req, res) => {
  res.status(201).json(await categoriasService.crearTipo(req.body, req.usuario));
});

export const patchTipo = asyncHandler(async (req, res) => {
  res.json(await categoriasService.actualizarTipo(Number(req.params.id), req.body, req.usuario));
});

export const deleteTipo = asyncHandler(async (req, res) => {
  res.json(await categoriasService.eliminarTipo(Number(req.params.id), req.usuario));
});
