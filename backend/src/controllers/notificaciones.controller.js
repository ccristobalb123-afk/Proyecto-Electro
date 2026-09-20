import * as pushService from "../services/push.service.js";
import { asyncHandler } from "../lib/errors.js";

export const getVapidPublicKey = asyncHandler(async (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null, configurado: pushService.vapidConfigurado() });
});

export const postSuscribir = asyncHandler(async (req, res) => {
  await pushService.guardarSuscripcion(req.usuario.id, req.body);
  res.status(201).json({ ok: true });
});

export const postDesuscribir = asyncHandler(async (req, res) => {
  await pushService.eliminarSuscripcion(req.body.endpoint);
  res.json({ ok: true });
});
