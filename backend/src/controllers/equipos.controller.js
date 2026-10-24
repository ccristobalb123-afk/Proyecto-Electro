import * as equiposService from "../services/equipos.service.js";
import { asyncHandler, validacionFallida } from "../lib/errors.js";

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
  const actualizado = await equiposService.actualizarFotosEquipo(equipoId, req.body.fotos, req.empresasPermitidas, req.usuario.id);
  res.json(actualizado);
});

export const getFotoActual = asyncHandler(async (req, res) => {
  const { mime, buffer, inmutable } = await equiposService.obtenerFotoActual(Number(req.params.id), Number(req.params.posicion), String(req.query.v || ""), req.empresasPermitidas);
  // Con la versión vigente en la URL, la foto no cambia: caché de un año.
  // Sin ella (o con una vieja), se vuelve a validar cada vez.
  res.set({ "Content-Type": mime, "Cache-Control": inmutable ? "private, max-age=31536000, immutable" : "private, no-cache" });
  res.send(buffer);
});

export const getFoto = asyncHandler(async (req, res) => {
  const { mime, buffer } = await equiposService.obtenerFotoEquipo(Number(req.params.id), Number(req.params.fotoId), req.empresasPermitidas);
  // Una foto guardada nunca cambia (otra foto = otro id).
  res.set({ "Content-Type": mime, "Cache-Control": "private, max-age=31536000, immutable" });
  res.send(buffer);
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
    const { vehiculoId, personalId } = req.body;
    actualizado = await equiposService.asignarEquipo(equipoId, { vehiculoId, personalId }, req.empresasPermitidas, req.usuario.id);
  } else if (estado === "mantenimiento") {
    actualizado = await equiposService.enviarAMantenimiento(equipoId, req.body.comentario, req.empresasPermitidas, req.usuario.id);
  } else {
    const { fechaInspeccion, fechaVencimiento } = req.body;
    actualizado = await equiposService.cambiarEstadoEquipo(equipoId, estado, req.empresasPermitidas, req.usuario.id, { fechaInspeccion, fechaVencimiento });
  }
  res.json(actualizado);
});

export const postDevolver = asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.id);
  res.json(await equiposService.devolverEquipo(equipoId, req.empresasPermitidas, req.usuario.id));
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

// Camiones y personal de TODAS las empresas, para el modal "Asignar equipo".
export const getDestinatarios = asyncHandler(async (req, res) => {
  res.json(await equiposService.listarDestinatarios(Number(req.params.id), req.empresasPermitidas));
});

export const getAsignacionesActuales = asyncHandler(async (req, res) => {
  res.json(await equiposService.listarAsignacionesActuales(req.empresasPermitidas));
});

export const getAsignaciones = asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.id);
  if (!Number.isInteger(equipoId)) throw validacionFallida("Identificador de equipo inválido.");
  res.json(await equiposService.listarAsignaciones(equipoId, req.empresasPermitidas));
});

export const getHistorial = asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.id);
  if (!Number.isInteger(equipoId)) throw validacionFallida("Identificador de equipo inválido.");
  const historial = await equiposService.obtenerHojaDeVida(equipoId, req.empresasPermitidas);
  res.json(historial);
});
