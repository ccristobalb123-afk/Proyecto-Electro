import { db } from "../lib/db.js";
import { validacionFallida, ApiError } from "../lib/errors.js";

function serializar(p) {
  return { dni: p.dni, nombre: p.nombre };
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

// Usado SOLO por Cursos/Fotocheck/EMO — a diferencia de Contratos, acá
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

// Una persona puede tener contrato con Corevex pero no con Electro —
// sin este chequeo, cualquiera con acceso a Electro podía usar el DNI
// de alguien que solo trabaja para Corevex y crearle un curso "de
// Electro", aunque esa persona nunca tuvo relación con esa empresa.
export async function buscarPersonalConContratoEnEmpresa(dni, empresaId) {
  const personal = await buscarPersonalRegistrado(dni);
  const tieneContrato = await db.contrato.findFirst({ where: { personalId: personal.id, empresaId } });
  if (!tieneContrato) {
    throw validacionFallida("Ese trabajador no tiene un contrato registrado en esta empresa.");
  }
  return personal;
}

export async function listarTrabajadoresRegistrados({ q }) {
  const personal = await db.personal.findMany({
    where: q
      ? { OR: [{ nombre: { contains: q, mode: "insensitive" } }, { dni: { contains: q } }] }
      : undefined,
    orderBy: { nombre: "asc" },
  });
  return personal.map(serializar);
}
