import * as personalService from "../services/personal.service.js";
import { asyncHandler } from "../lib/errors.js";

export const getPersonal = asyncHandler(async (req, res) => {
  const nombres = await personalService.listarTrabajadoresRegistrados(req.query, req.empresasPermitidas);
  res.json(nombres);
});
