import * as usuariosService from "../services/usuarios.service.js";
import { asyncHandler } from "../lib/errors.js";

export const getUsuarios = asyncHandler(async (req, res) => {
  const usuarios = await usuariosService.listarUsuarios(req.query);
  res.json(usuarios);
});

export const postUsuario = asyncHandler(async (req, res) => {
  const nuevo = await usuariosService.crearUsuario(req.body, req.usuario.esSuperAdmin);
  res.status(201).json(nuevo);
});

export const patchUsuario = asyncHandler(async (req, res) => {
  const usuarioId = Number(req.params.id);
  // "activo" viaja solo (cambiar estado) o junto con los demás campos
  // (editar) — ambos casos pasan por el mismo PATCH, igual que en el
  // mock del frontend.
  if (Object.keys(req.body).length === 1 && "activo" in req.body) {
    const actualizado = await usuariosService.cambiarEstadoUsuario(usuarioId, req.body.activo);
    return res.json(actualizado);
  }
  const actualizado = await usuariosService.actualizarUsuario(usuarioId, req.body, req.usuario.esSuperAdmin);
  res.json(actualizado);
});

export const postResetPassword = asyncHandler(async (req, res) => {
  const usuarioId = Number(req.params.id);
  const resultado = await usuariosService.resetearPassword(usuarioId);
  res.json(resultado);
});
