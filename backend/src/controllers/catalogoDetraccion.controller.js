import * as catalogoDetraccionService from "../services/catalogoDetraccion.service.js";
import { asyncHandler } from "../lib/errors.js";

export const getCatalogoDetraccion = asyncHandler(async (req, res) => {
  res.json(await catalogoDetraccionService.listarCatalogoDetraccion({ soloVigentes: req.query.vigentes !== "false" }));
});
