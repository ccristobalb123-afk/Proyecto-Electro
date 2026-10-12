import { db } from "../lib/db.js";
import { buscarPersonalRegistrado } from "./personal.service.js";
import { calcularEstado, formatearFechaDia, iniciales, TIPO_CURSO_A_TEXTO } from "../lib/estadoVencimiento.js";
import { ApiError, sinPermiso, conflicto, validacionFallida } from "../lib/errors.js";
import { borrarArchivoSiHuerfano } from "../lib/archivos.js";
import { empresasParaFiltro } from "../lib/autorizacionEmpresa.js";

const TIPO_A_TEXTO = TIPO_CURSO_A_TEXTO;

function serializar(curso) {
  return {
    id: curso.id,
    trabajador: curso.personal.nombre,
    dni: curso.personal.dni,
    iniciales: iniciales(curso.personal.nombre),
    empresa: curso.empresa.slug,
    tipo: TIPO_A_TEXTO[curso.tipo],
    vence: formatearFechaDia(curso.fechaVencimiento),
    estado: calcularEstado(curso.fechaVencimiento, curso.diasAnticipacion, curso.estadoManual),
    // "yyyy-mm-dd" para precargar los <input type="date"> al editar.
    fechaInicio: curso.fechaInicio.toISOString().slice(0, 10),
    fechaVencimiento: curso.fechaVencimiento.toISOString().slice(0, 10),
    diasAnticipacion: curso.diasAnticipacion,
    // Mismos campos que serializa Contratos, así la tabla de RRHH
    // muestra "Ver" / "Adjuntar" igual en las dos pestañas.
    archivo: !!curso.archivoUrl,
    ...(curso.archivoUrl ? { archivoUrl: curso.archivoUrl, archivoNombre: curso.archivoNombre } : {}),
  };
}

// La empresa de un Curso/EMO sale del contrato del trabajador — antes
// se elegía a mano en el modal, aparte de la del contrato. Se valida
// siempre acá, no solo en la interfaz:
//   - sin contrato en ninguna empresa → 409 "Primero registra el contrato"
//   - empresa enviada donde no tiene contrato → 409
//   - empresa a la que el usuario no tiene acceso → 403
//   - sin empresa enviada: si tiene contrato en UNA (accesible), esa;
//     si tiene en varias, hay que elegir.
async function resolverPersonalYEmpresa(dni, empresaSlug, empresasPermitidas) {
  const personal = await buscarPersonalRegistrado(dni);
  const contratos = await db.contrato.findMany({ where: { personalId: personal.id }, include: { empresa: true } });
  const empresasContrato = [...new Map(contratos.map((c) => [c.empresa.slug, c.empresa])).values()];

  if (empresasContrato.length === 0) {
    throw conflicto("Primero registra el contrato de este trabajador.", "SIN_CONTRATO");
  }

  if (empresaSlug) {
    const empresa = empresasContrato.find((e) => e.slug === empresaSlug);
    if (!empresa) {
      throw conflicto(`${personal.nombre} no tiene contrato en esa empresa. Elige una empresa donde tenga contrato.`, "EMPRESA_SIN_CONTRATO");
    }
    if (!empresasPermitidas.includes(empresa.slug)) throw sinPermiso();
    return { personal, empresa };
  }

  const accesibles = empresasContrato.filter((e) => empresasPermitidas.includes(e.slug));
  if (accesibles.length === 0) throw sinPermiso();
  if (empresasContrato.length > 1) {
    throw validacionFallida(`${personal.nombre} tiene contrato en más de una empresa: elige a cuál corresponde este registro.`);
  }
  return { personal, empresa: accesibles[0] };
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
  // A diferencia de Contratos, acá el trabajador YA debe existir —
  // este endpoint nunca da de alta a alguien nuevo.
  const { personal, empresa } = await resolverPersonalYEmpresa(datos.dni, datos.empresa, empresasPermitidas);

  try {
    const creado = await db.curso.create({
      data: {
        personalId: personal.id,
        empresaId: empresa.id,
        tipo: datos.tipo.toUpperCase(),
        fechaInicio: new Date(datos.fechaInicio),
        fechaVencimiento: new Date(datos.fechaVencimiento),
        diasAnticipacion: datos.diasAnticipacion ?? 30,
        archivoNombre: datos.archivoNombre || null,
        archivoUrl: datos.archivoUrl || null,
      },
      include: { personal: true, empresa: true },
    });
    return serializar(creado);
  } catch (err) {
    if (err.code === "P2002") {
      throw new ApiError(
        409,
        "CURSO_DUPLICADO",
        `${personal.nombre} ya tiene un registro de "${datos.tipo}" en ${empresa.nombre} — edítalo en vez de crear uno nuevo.`
      );
    }
    throw err;
  }
}

export async function actualizarCurso(cursoId, datos, empresasPermitidas) {
  await buscarCurso(cursoId, empresasPermitidas);
  const { personal, empresa } = await resolverPersonalYEmpresa(datos.dni, datos.empresa, empresasPermitidas);

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
        // Solo se reemplaza si llegó un archivo nuevo — editar las
        // fechas no debe borrar el documento que ya estaba adjunto.
        ...(datos.archivoUrl ? { archivoNombre: datos.archivoNombre || null, archivoUrl: datos.archivoUrl } : {}),
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

export async function adjuntarArchivoCurso(cursoId, archivoNombre, archivoUrl, empresasPermitidas) {
  await buscarCurso(cursoId, empresasPermitidas);

  const actualizado = await db.curso.update({
    where: { id: cursoId },
    data: { archivoNombre, archivoUrl },
    include: { personal: true, empresa: true },
  });
  return serializar(actualizado);
}

export async function eliminarCurso(cursoId, empresasPermitidas) {
  const curso = await buscarCurso(cursoId, empresasPermitidas);
  await db.curso.delete({ where: { id: cursoId } });
  await borrarArchivoSiHuerfano(curso.archivoUrl);
  return { ok: true };
}
