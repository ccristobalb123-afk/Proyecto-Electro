import * as categoriasService from "../services/categoriasEquipo.service.js";
import { asyncHandler } from "../lib/errors.js";

export const getCategorias = asyncHandler(async (req, res) => {
  res.json(await categoriasService.listarCategorias());
});
