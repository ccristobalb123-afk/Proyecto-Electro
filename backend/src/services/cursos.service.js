import { db } from "../lib/db.js";
import { buscarPersonalConContratoEnEmpresa } from "./personal.service.js";
import { calcularEstado, formatearFecha, iniciales } from "../lib/estadoVencimiento.js";
import { ApiError, sinPermiso } from "../lib/errors.js";
import { empresasParaFiltro, verificarAccesoEmpresa } from "../lib/autorizacionEmpresa.js";

// "EMO" tiene que quedar en mayúsculas (es una sigla, no una palabra),
// a diferencia de "Curso"/"Fotocheck" — por eso es un mapeo explícito
// en vez de un capitalize genérico para los 3 casos.
const TIPO_A_TEXTO = { CURSO: "Curso", FOTOCHECK: "Fotocheck", EMO: "EMO" };

function serializar(curso) {
  return {
    id: curso.id,
    trabajador: curso.personal.nombre,
    dni: curso.personal.dni,
    iniciales: iniciales(curso.personal.nombre),
    empresa: curso.empresa.slug,
    tipo: TIPO_A_TEXTO[curso.tipo],
    vence: formatearFecha(curso.fechaVencimiento),
    estado: calcularEstado(curso.fechaVencimiento, curso.diasAnticipacion, curso.estadoManual),
  };
}

async function buscarEmpresa(slug, empresasPermitidas) {
  verificarAccesoEmpresa(slug, empresasPermitidas);
  const empresa = await db.empresa.findUnique({ where: { slug } });
  if (!empresa) throw new ApiError(400, "VALIDACION", "Empresa inválida.");
  return empresa;
}

async function buscarCurso(cursoId, empresasPermitidas) {
  const curso = await db.curso.findUnique({ where: { id: cursoId }, include: { empresa: true } });
  if (!curso) throw new ApiError(404, "NO_ENCONTRADO", "El registro no existe.");
  if (!empresasPermitidas.includes(curso.empresa.slug)) throw sinPermiso();
  return curso;
}

export async function listarCursos({ empresa, estado, q }, empresasPermitidas) {
  const empresasFiltro = empresasParaFiltro(empresa, empresasPermitidas);
  const cursos = await db.curso.findMany({
    where: {
      empresa: { slug: { in: empresasFiltro } },
      ...(q ? { personal: { OR: [{ nombre: { contains: q, mode: "insensitive" } }, { dni: { contains: q } }] } } : {}),
    },
    include: { personal: true, empresa: true },
    orderBy: { creadoEn: "desc" },
  });

  let resultado = cursos.map(serializar);
  if (estado) resultado = resultado.filter((c) => c.estado === estado);
  return resultado;
}

export async function crearCurso(datos, empresasPermitidas) {
  const empresa = await buscarEmpresa(datos.empresa, empresasPermitidas);
  // A diferencia de Contratos, acá el trabajador YA debe existir —
  // este endpoint nunca da de alta a alguien nuevo.
  const personal = await buscarPersonalConContratoEnEmpresa(datos.dni, empresa.id);

  try {
    const creado = await db.curso.create({
      data: {
        personalId: personal.id,
        empresaId: empresa.id,
        tipo: datos.tipo.toUpperCase(),
        fechaInicio: new Date(datos.fechaInicio),
        fechaVencimiento: new Date(datos.fechaVencimiento),
        diasAnticipacion: datos.diasAnticipacion ?? 30,
      },
      include: { personal: true, empresa: true },
    });
    return serializar(creado);
  } catch (err) {
    if (err.code === "P2002") {
      throw new ApiError(
        409,
        "CURSO_DUPLICADO",
        `${personal.nombre} ya tiene un registro de "${datos.tipo}" en esta empresa — edítalo en vez de crear uno nuevo.`
      );
    }
    throw err;
  }
}

export async function actualizarCurso(cursoId, datos, empresasPermitidas) {
  await buscarCurso(cursoId, empresasPermitidas);
  const empresa = await buscarEmpresa(datos.empresa, empresasPermitidas);
  const personal = await buscarPersonalConContratoEnEmpresa(datos.dni, empresa.id);

  try {
    const actualizado = await db.curso.update({
      where: { id: cursoId },
      data: {
        personalId: personal.id,
        empresaId: empresa.id,
        tipo: datos.tipo.toUpperCase(),
        fechaInicio: new Date(datos.fechaInicio),
        fechaVencimiento: new Date(datos.fechaVencimiento),
        diasAnticipacion: datos.diasAnticipacion ?? 30,
      },
      include: { personal: true, empresa: true },
    });
    return serializar(actualizado);
  } catch (err) {
    if (err.code === "P2002") {
      throw new ApiError(409, "CURSO_DUPLICADO", `${personal.nombre} ya tiene otro registro de ese tipo en esa empresa.`);
    }
    throw err;
  }
}

export async function eliminarCurso(cursoId, empresasPermitidas) {
  await buscarCurso(cursoId, empresasPermitidas);
  await db.curso.delete({ where: { id: cursoId } });
  return { ok: true };
}
