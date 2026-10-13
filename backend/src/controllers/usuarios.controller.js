import * as usuariosService from "../services/usuarios.service.js";
import { asyncHandler, validacionFallida } from "../lib/errors.js";

// Quién hace el pedido: el servicio lo usa para limitar qué usuarios y
// qué empresas puede gestionar.
const solicitante = (req) => ({ id: req.usuario.id, esSuperAdmin: req.usuario.esSuperAdmin, empresas: req.empresasPermitidas });

export const getUsuarios = asyncHandler(async (req, res) => {
  const usuarios = await usuariosService.listarUsuarios(req.query, solicitante(req));
  res.json(usuarios);
});

export const postUsuario = asyncHandler(async (req, res) => {
  const nuevo = await usuariosService.crearUsuario(req.body, solicitante(req));
  res.status(201).json(nuevo);
});

export const patchUsuario = asyncHandler(async (req, res) => {
  const usuarioId = Number(req.params.id);
  // "activo" viaja solo (cambiar estado) o junto con los demás campos
  // (editar) — ambos casos pasan por el mismo PATCH, igual que en el
  // mock del frontend.
  if (Object.keys(req.body).length === 1 && "activo" in req.body) {
    const actualizado = await usuariosService.cambiarEstadoUsuario(usuarioId, req.body.activo, solicitante(req));
    return res.json(actualizado);
  }
  const actualizado = await usuariosService.actualizarUsuario(usuarioId, req.body, solicitante(req));
  res.json(actualizado);
});

export const postResetPassword = asyncHandler(async (req, res) => {
  const usuarioId = Number(req.params.id);
  const resultado = await usuariosService.resetearPassword(usuarioId, solicitante(req));
  res.json(resultado);
});

export const deleteUsuario = asyncHandler(async (req, res) => {
  const usuarioId = Number(req.params.id);
  if (!Number.isInteger(usuarioId)) throw validacionFallida("Identificador de usuario inválido.");
  res.json(await usuariosService.eliminarUsuario(usuarioId, solicitante(req)));
});

export const postCerrarSesiones = asyncHandler(async (req, res) => {
  const usuarioId = Number(req.params.id);
  if (!Number.isInteger(usuarioId)) throw validacionFallida("Identificador de usuario inválido.");
  res.json(await usuariosService.cerrarSesionesDeUsuario(usuarioId, solicitante(req)));
});
