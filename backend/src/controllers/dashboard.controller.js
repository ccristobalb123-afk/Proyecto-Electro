import * as dashboardService from "../services/dashboard.service.js";
import { asyncHandler } from "../lib/errors.js";

export const getKpis = asyncHandler(async (req, res) => {
  res.json(await dashboardService.obtenerKpis(req.empresasPermitidas));
});

export const getAlertas = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  res.json(await dashboardService.listarAlertas({ limit }, req.empresasPermitidas));
});

export const getActividadReciente = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  res.json(await dashboardService.listarActividadReciente({ limit }, req.empresasPermitidas));
});

export const getComparativo = asyncHandler(async (req, res) => {
  res.json(await dashboardService.obtenerComparativo(req.empresasPermitidas));
});
