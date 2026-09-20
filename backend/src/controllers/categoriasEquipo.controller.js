import * as categoriasService from "../services/categoriasEquipo.service.js";
import { asyncHandler } from "../lib/errors.js";

export const getCategorias = asyncHandler(async (req, res) => {
  const categorias = await categoriasService.listarCategorias();
  res.json(categorias);
});

export const postCategoria = asyncHandler(async (req, res) => {
  const nombre = await categoriasService.agregarCategoria(req.body.nombre, req.body.campos);
  res.status(201).json({ nombre });
});

export const patchCategoria = asyncHandler(async (req, res) => {
  const nombre = await categoriasService.actualizarCategoria(req.params.nombre, req.body);
  res.json({ nombre });
});

export const deleteCategoria = asyncHandler(async (req, res) => {
  res.json(await categoriasService.eliminarCategoria(req.params.nombre));
});
