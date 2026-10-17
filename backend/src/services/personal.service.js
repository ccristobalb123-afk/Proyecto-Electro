import { db } from "../lib/db.js";
import { validacionFallida, ApiError } from "../lib/errors.js";

// `empresas`: dónde tiene contrato (solo las que el usuario puede ver).
// El modal de Cursos/EMO la usa para no volver a pedir la empresa.
function serializar(p, empresasPermitidas) {
  const empresas = [...new Set(p.contratos.map((c) => c.empresa.slug))].filter((e) => empresasPermitidas.includes(e));
  return { id: p.id, dni: p.dni, nombre: p.nombre, empresas };
}

// Usado SOLO por Contratos — es el único lugar del sistema donde se
// registra a alguien nuevo. El DNI es la identidad real (el nombre
// puede repetirse entre 2 personas distintas, o escribirse distinto
// la segunda vez) — se busca por DNI, y si ya existe con un nombre
// distinto al que llegó ahora, se actualiza (una corrección de
// ortografía, por ejemplo), nunca se crea un duplicado.
export async function buscarOCrearPersonal(dni, nombre) {
  const dniLimpio = dni.trim();
  const nombreLimpio = nombre.trim();

  const existente = await db.personal.findUnique({ where: { dni: dniLimpio } });
  if (existente) {
    if (existente.nombre !== nombreLimpio) {
      return db.personal.update({ where: { id: existente.id }, data: { nombre: nombreLimpio } });
    }
    return existente;
  }
  return db.personal.create({ data: { dni: dniLimpio, nombre: nombreLimpio } });
}

// Usado SOLO por Cursos/EMO — a diferencia de Contratos, acá
// NUNCA se crea a alguien nuevo. Si el DNI no existe todavía como
// personal registrado, es un error (el frontend ya debería haber
// mostrado el selector solo con gente válida, pero el backend no puede
// confiar en que el frontend sea la única puerta de entrada).
export async function buscarPersonalRegistrado(dni) {
  const personal = await db.personal.findUnique({ where: { dni: dni.trim() } });
  if (!personal) {
    throw validacionFallida("Ese trabajador no está registrado. Créalo primero desde Contratos.");
  }
  return personal;
}

// Solo personal con contrato en alguna empresa a la que el usuario
// tiene acceso — antes listaba a todo el personal, también el de la
// otra empresa y el que no tiene ningún contrato.
export async function listarTrabajadoresRegistrados({ q }, empresasPermitidas) {
  const personal = await db.personal.findMany({
    where: {
      contratos: { some: { empresa: { slug: { in: empresasPermitidas } } } },
      ...(q ? { OR: [{ nombre: { contains: q, mode: "insensitive" } }, { dni: { contains: q } }] } : {}),
    },
    include: { contratos: { include: { empresa: true } } },
    orderBy: { nombre: "asc" },
  });
  return personal.map((p) => serializar(p, empresasPermitidas));
}
