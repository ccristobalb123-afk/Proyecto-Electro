import { db } from "../lib/db.js";
import { ApiError, validacionFallida, conflicto } from "../lib/errors.js";
import { registrarEventoAuditoria } from "../lib/seguridad.js";
import { CAMPOS_OPCIONALES, camposDelTipo, campoIdentificador, destinoApi, esHeredada, admiteRegistro } from "../lib/tiposEquipo.js";
import { COLUMNAS_SIN_FOTOS } from "./equipos.service.js";

const ORDEN = [{ orden: "asc" }, { id: "asc" }];
const noExiste = () => new ApiError(404, "NO_ENCONTRADO", "El tipo de equipo no existe.");
const DESTINO_ENUM = { camion: "CAMION", persona: "PERSONA" };
const textoDestino = (destino) => (destino === "CAMION" ? "camiones" : "personas");

// Identificador visible de un equipo (mismo criterio que equipos.service.js).
const identificador = (e) => e.codigo || e.serial || `Equipo #${e.id}`;
const destinatarioDe = (e) => (e.vehiculo ? `Camión ${e.vehiculo.placa}` : e.personal ? e.personal.nombre : null);

function serializar(c, conteo) {
  return {
    id: c.id,
    nombre: c.nombre,
    tipo: c.tipo,
    destino: destinoApi(c),
    variasPorDestinatario: c.variasPorDestinatario,
    activo: c.activo,
    // Datos que pide (sin las fechas, que se piden siempre).
    camposRequeridos: c.camposRequeridos || [],
    campos: camposDelTipo(c) || ["codigo"],
    identificador: campoIdentificador(c),
    ...(esHeredada(c) ? { antigua: true, camposLibres: c.campos } : {}),
    ...(conteo ? { equipos: conteo.equipos, asignados: conteo.asignados } : {}),
  };
}

/**
 * Tipos para el formulario de equipos, los filtros y la asignación, en
 * su orden: los que admiten equipos nuevos y, además, los desactivados o
 * heredados que todavía tienen equipos (para verlos y editarlos; se
 * marcan con `activo: false` / `antigua: true`).
 */
export async function listarCategorias() {
  const categorias = await db.categoriaEquipo.findMany({ include: { _count: { select: { equipos: true } } }, orderBy: ORDEN });
  return categorias.filter((c) => admiteRegistro(c) || c._count.equipos > 0).map((c) => serializar(c));
}

/** Todos los tipos con cuántos equipos tienen, para la pantalla "Tipos de equipo". */
export async function listarParaGestion() {
  const [categorias, asignados] = await Promise.all([
    db.categoriaEquipo.findMany({ include: { _count: { select: { equipos: true } } }, orderBy: ORDEN }),
    db.equipo.groupBy({ by: ["categoriaId"], where: { OR: [{ vehiculoId: { not: null } }, { personalId: { not: null } }] }, _count: { _all: true } }),
  ]);
  const asignadosPor = new Map(asignados.map((a) => [a.categoriaId, a._count._all]));
  return categorias.map((c) => serializar(c, { equipos: c._count.equipos, asignados: asignadosPor.get(c.id) || 0 }));
}

// ---- Validación de los datos del formulario ----

function nombreValido(nombre) {
  const limpio = typeof nombre === "string" ? nombre.trim().replace(/\s+/g, " ") : "";
  if (limpio.length < 2) throw validacionFallida("Escribe el nombre del tipo (al menos 2 caracteres).");
  if (limpio.length > 60) throw validacionFallida("El nombre del tipo puede tener hasta 60 caracteres.");
  return limpio;
}

// Solo los campos conocidos, sin repetir, en el orden de siempre; debe
// estar Código o Serial (con eso se identifica cada equipo, y son únicos
// dentro del tipo).
function camposValidos(campos) {
  if (!Array.isArray(campos)) throw validacionFallida("Elige los datos que se piden al registrar un equipo.");
  const desconocido = campos.find((c) => !CAMPOS_OPCIONALES.includes(c));
  if (desconocido) throw validacionFallida(`Dato desconocido: ${desconocido}.`);
  const ordenados = CAMPOS_OPCIONALES.filter((c) => campos.includes(c));
  if (!ordenados.includes("codigo") && !ordenados.includes("serial")) {
    throw validacionFallida("Elige al menos Código o Serial: con eso se identifica cada equipo.");
  }
  return ordenados;
}

// Dos pedidos a la vez con el mismo nombre (crear o renombrar) se hacen
// uno detrás del otro: el segundo ve el nombre ya tomado. La base además
// tiene un índice único sobre lower(nombre).
async function verificarNombreLibre(tx, nombre, excluirId = null) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('categorias_equipo_nombre'))`;
  const otro = await tx.categoriaEquipo.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" }, ...(excluirId ? { NOT: { id: excluirId } } : {}) },
  });
  if (otro) throw conflicto(`Ya existe un tipo de equipo llamado "${otro.nombre}".`, "TIPO_DUPLICADO");
}

const errorNombreRepetido = (err, nombre) =>
  err?.code === "P2002" ? conflicto(`Ya existe un tipo de equipo llamado "${nombre}".`, "TIPO_DUPLICADO") : err;

const datosAuditoria = (c) => ({
  id: c.id,
  nombre: c.nombre,
  destino: destinoApi(c),
  variasPorDestinatario: c.variasPorDestinatario,
  campos: c.camposRequeridos,
  activo: c.activo,
});

/** Cualquier usuario con acceso a Operaciones. */
export async function crearTipo(body, usuario) {
  const nombre = nombreValido(body.nombre);
  const destino = DESTINO_ENUM[body.destino];
  if (!destino) throw validacionFallida("Elige a quién se asigna: Camión o Persona.");
  const camposRequeridos = camposValidos(body.camposRequeridos);
  const variasPorDestinatario = body.variasPorDestinatario === true;

  let creado;
  try {
    creado = await db.$transaction(async (tx) => {
      await verificarNombreLibre(tx, nombre);
      const { _max } = await tx.categoriaEquipo.aggregate({ _max: { orden: true }, where: { orden: { lt: 100 } } });
      return tx.categoriaEquipo.create({
        data: { nombre, campos: [], destino, variasPorDestinatario, camposRequeridos, activo: true, orden: (_max.orden ?? 0) + 1 },
      });
    });
  } catch (err) {
    throw errorNombreRepetido(err, nombre);
  }
  registrarEventoAuditoria({ evento: "tipo_equipo_creado", usuarioId: usuario.id, usuario: usuario.usuario, tipoEquipo: datosAuditoria(creado) });
  return serializar(creado, { equipos: 0, asignados: 0 });
}

// Asignaciones actuales del tipo con su destinatario.
const asignadosDelTipo = (tx, categoriaId) =>
  tx.equipo.findMany({
    where: { categoriaId, OR: [{ vehiculoId: { not: null } }, { personalId: { not: null } }] },
    select: { ...COLUMNAS_SIN_FOTOS, vehiculo: true, personal: true },
    orderBy: { id: "asc" },
  });

const lista = (items) => (items.length > 5 ? `${items.slice(0, 5).join("; ")} y ${items.length - 5} más` : items.join("; "));

/**
 * Solo SuperAdmin (lo exige la ruta). Cambios posibles: nombre, destino,
 * varias por destinatario, datos que pide y activo. Reglas de seguridad
 * de datos, también para SuperAdmin:
 *   - destino / varias: solo si no dejan asignaciones actuales que
 *     incumplan la regla nueva (se listan);
 *   - datos que pide: solo si el tipo no tiene equipos;
 *   - reactivar: solo si el tipo tiene datos definidos (no heredado).
 */
export async function actualizarTipo(id, body, usuario) {
  if (!Number.isInteger(id)) throw noExiste();
  let cambios;
  let resultado;
  try {
    resultado = await db.$transaction(async (tx) => {
      // Bloquea el tipo: una asignación del mismo tipo que llegue a la vez
      // espera (asignarEquipo lo lee con FOR SHARE) y ve la regla nueva.
      const filas = await tx.$queryRaw`SELECT id FROM categorias_equipo WHERE id = ${id} FOR UPDATE`;
      if (!filas.length) throw noExiste();
      const actual = await tx.categoriaEquipo.findUnique({ where: { id } });
      const data = {};

      if (body.nombre !== undefined) {
        const nombre = nombreValido(body.nombre);
        if (nombre !== actual.nombre) {
          await verificarNombreLibre(tx, nombre, id);
          data.nombre = nombre;
        }
      }

      const destino = body.destino !== undefined ? DESTINO_ENUM[body.destino] : actual.destino;
      if (!destino) throw validacionFallida("Elige a quién se asigna: Camión o Persona.");
      const varias = body.variasPorDestinatario !== undefined ? body.variasPorDestinatario === true : actual.variasPorDestinatario;
      if (destino !== actual.destino || varias !== actual.variasPorDestinatario) {
        const asignados = await asignadosDelTipo(tx, id);
        if (destino !== actual.destino) {
          const incumplen = asignados.filter((e) => (destino === "CAMION" ? e.personalId : e.vehiculoId));
          if (incumplen.length) {
            throw conflicto(
              `No se puede cambiar a "solo ${textoDestino(destino)}": ${incumplen.length === 1 ? "este equipo está asignado" : `estos ${incumplen.length} equipos están asignados`} a ${destino === "CAMION" ? "personas" : "camiones"}: ${lista(incumplen.map((e) => `${identificador(e)} (${destinatarioDe(e)})`))}. Devuélvelos o reasígnalos primero.`,
              "TIPO_CON_ASIGNACIONES"
            );
          }
          data.destino = destino;
        }
        if (varias !== actual.variasPorDestinatario) {
          if (!varias) {
            const porDestinatario = new Map();
            for (const e of asignados) {
              const quien = destinatarioDe(e);
              porDestinatario.set(quien, [...(porDestinatario.get(quien) || []), identificador(e)]);
            }
            const repetidos = [...porDestinatario].filter(([, equipos]) => equipos.length > 1);
            if (repetidos.length) {
              throw conflicto(
                `No se puede limitar a una unidad por destinatario: ${lista(repetidos.map(([quien, equipos]) => `${quien} tiene ${equipos.length} (${equipos.join(", ")})`))}. Devuelve o reasigna los que sobran primero.`,
                "TIPO_CON_ASIGNACIONES"
              );
            }
          }
          data.variasPorDestinatario = varias;
        }
      }

      if (body.camposRequeridos !== undefined) {
        const campos = camposValidos(body.camposRequeridos);
        if (campos.join() !== (actual.camposRequeridos || []).join()) {
          const equipos = await tx.equipo.count({ where: { categoriaId: id } });
          if (equipos > 0) {
            throw conflicto(
              `No se pueden cambiar los datos que se piden: el tipo ya tiene ${equipos} ${equipos === 1 ? "equipo registrado" : "equipos registrados"} con los datos actuales.`,
              "TIPO_CON_EQUIPOS"
            );
          }
          data.camposRequeridos = campos;
        }
      }

      if (body.activo !== undefined && body.activo !== actual.activo) {
        const camposFinales = data.camposRequeridos || actual.camposRequeridos || [];
        if (body.activo && !camposFinales.length) {
          throw validacionFallida("Este tipo es de la versión anterior y no tiene definidos los datos que se piden: elígelos para poder reactivarlo.");
        }
        data.activo = body.activo === true;
      }

      cambios = Object.fromEntries(
        Object.keys(data).map((k) => [k, { antes: k === "destino" ? destinoApi(actual) : actual[k], despues: k === "destino" ? destinoApi(data) : data[k] }])
      );
      const act = Object.keys(data).length ? await tx.categoriaEquipo.update({ where: { id }, data }) : actual;
      return act;
    });
  } catch (err) {
    throw errorNombreRepetido(err, body.nombre);
  }

  if (Object.keys(cambios).length) {
    registrarEventoAuditoria({ evento: "tipo_equipo_modificado", usuarioId: usuario.id, usuario: usuario.usuario, tipoEquipo: { id, nombre: resultado.nombre }, cambios });
  }
  const [equipos, asignados] = await Promise.all([
    db.equipo.count({ where: { categoriaId: id } }),
    db.equipo.count({ where: { categoriaId: id, OR: [{ vehiculoId: { not: null } }, { personalId: { not: null } }] } }),
  ]);
  return serializar(resultado, { equipos, asignados });
}

/** Solo SuperAdmin (lo exige la ruta) y solo si el tipo no tiene ningún equipo. */
export async function eliminarTipo(id, usuario) {
  if (!Number.isInteger(id)) throw noExiste();
  const eliminado = await db.$transaction(async (tx) => {
    const filas = await tx.$queryRaw`SELECT id FROM categorias_equipo WHERE id = ${id} FOR UPDATE`;
    if (!filas.length) throw noExiste();
    const tipo = await tx.categoriaEquipo.findUnique({ where: { id } });
    const equipos = await tx.equipo.count({ where: { categoriaId: id } });
    if (equipos > 0) {
      throw conflicto(
        `No se puede eliminar "${tipo.nombre}": tiene ${equipos} ${equipos === 1 ? "equipo registrado" : "equipos registrados"} (contando los de baja). Desactívalo para que no se registren equipos nuevos de este tipo.`,
        "TIPO_CON_EQUIPOS"
      );
    }
    await tx.categoriaEquipo.delete({ where: { id } });
    return tipo;
  });
  registrarEventoAuditoria({ evento: "tipo_equipo_eliminado", usuarioId: usuario.id, usuario: usuario.usuario, tipoEquipo: datosAuditoria(eliminado) });
  return { ok: true };
}

