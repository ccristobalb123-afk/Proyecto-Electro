import * as cursosService from "../services/cursos.service.js";
import { asyncHandler } from "../lib/errors.js";

export const getCursos = asyncHandler(async (req, res) => {
  const cursos = await cursosService.listarCursos(req.query, req.empresasPermitidas);
  res.json(cursos);
});

export const postCurso = asyncHandler(async (req, res) => {
  const nuevo = await cursosService.crearCurso(req.body, req.empresasPermitidas);
  res.status(201).json(nuevo);
});

export const patchCurso = asyncHandler(async (req, res) => {
  const cursoId = Number(req.params.id);
  const actualizado = await cursosService.actualizarCurso(cursoId, req.body, req.empresasPermitidas);
  res.json(actualizado);
});

export const deleteCurso = asyncHandler(async (req, res) => {
  const cursoId = Number(req.params.id);
  res.json(await cursosService.eliminarCurso(cursoId, req.empresasPermitidas));
});
