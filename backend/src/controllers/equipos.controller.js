import * as equiposService from "../services/equipos.service.js";
import { asyncHandler } from "../lib/errors.js";

export const getEquipos = asyncHandler(async (req, res) => {
  const equipos = await equiposService.listarEquipos(req.query, req.empresasPermitidas);
  res.json(equipos);
});

export const postEquipo = asyncHandler(async (req, res) => {
  const nuevo = await equiposService.crearEquipo(req.body, req.empresasPermitidas, req.usuario.id);
  res.status(201).json(nuevo);
});

export const patchFotos = asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.id);
  const actualizado = await equiposService.actualizarFotosEquipo(equipoId, req.body.fotos, req.empresasPermitidas);
  res.json(actualizado);
});

export const patchEquipo = asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.id);
  const actualizado = await equiposService.actualizarEquipo(equipoId, req.body, req.empresasPermitidas, req.usuario.id);
  res.json(actualizado);
});

export const deleteEquipo = asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.id);
  res.json(await equiposService.eliminarEquipo(equipoId, req.empresasPermitidas));
});

// El body puede traer 1 de 3 formas (ver patchEstadoEquipoSchema) —
// acá se decide cuál de las 3 operaciones de negocio corresponde.
export const patchEstado = asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.id);
  const { estado } = req.body;

  let actualizado;
  if (estado === "asignado") {
    actualizado = await equiposService.asignarEquipo(equipoId, req.body.vehiculoId, req.empresasPermitidas, req.usuario.id);
  } else if (estado === "mantenimiento") {
    actualizado = await equiposService.enviarAMantenimiento(equipoId, req.body.comentario, req.empresasPermitidas, req.usuario.id);
  } else {
    actualizado = await equiposService.cambiarEstadoEquipo(equipoId, estado, req.empresasPermitidas);
  }
  res.json(actualizado);
});

export const patchDarDeBaja = asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.id);
  const actualizado = await equiposService.darDeBajaEquipo(equipoId, req.body.motivo, req.empresasPermitidas, req.usuario.id);
  res.json(actualizado);
});

export const postInspeccion = asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.id);
  const actualizado = await equiposService.registrarInspeccion(equipoId, req.body, req.empresasPermitidas, req.usuario.id);
  res.json(actualizado);
});

export const getHistorial = asyncHandler(async (req, res) => {
  const historial = await equiposService.obtenerHojaDeVida(req.params.codigo, req.empresasPermitidas);
  res.json(historial);
});
