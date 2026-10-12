import bcrypt from "bcrypt";
import { db } from "../lib/db.js";
import { serializarUsuarioAdmin, buscarPorId } from "./usuario.service.js";
import { generarPasswordTemporal } from "../lib/password.js";
import { enviarCorreoPasswordTemporal } from "./email.service.js";
import { revocarTodosLosRefreshTokens } from "./refreshTokens.service.js";
import { MODULOS_DISPONIBLES } from "../lib/roles.js";
import { validacionFallida, ApiError, conflicto } from "../lib/errors.js";

const RONDAS_BCRYPT = 12;
const INCLUDE = { empresas: { include: { empresa: true } }, modulos: true };

// Nunca debe quedar el sistema sin al menos un SuperAdmin activo — ni
// desactivándolo, ni quitándole el control total. Se usa tanto en
// cambiarEstadoUsuario como en actualizarUsuario.
async function verificarNoEsElUltimoSuperAdmin(usuarioId) {
  const otrosSuperAdminsActivos = await db.usuario.count({
    where: { esSuperAdmin: true, activo: true, id: { not: usuarioId } },
  });
  if (otrosSuperAdminsActivos === 0) {
    throw validacionFallida("No puedes hacer esto — dejaría al sistema sin ningún SuperAdmin activo.");
  }
}

function modulosValidos(modulos) {
  return [...new Set(modulos || [])].filter((m) => MODULOS_DISPONIBLES.includes(m));
}

async function empresaIdsPorSlugs(slugs) {
  const empresas = await db.empresa.findMany({ where: { slug: { in: slugs } } });
  return empresas.map((e) => e.id);
}

async function validarUsuarioYCorreoLibres({ usuario, correo, excluirId }) {
  const yaExisteUsuario = await db.usuario.findUnique({ where: { usuario } });
  if (yaExisteUsuario && yaExisteUsuario.id !== excluirId) {
    throw new ApiError(409, "USUARIO_DUPLICADO", "Ya existe alguien con ese nombre de usuario.");
  }
  const yaExisteCorreo = await db.usuario.findUnique({ where: { correo } });
  if (yaExisteCorreo && yaExisteCorreo.id !== excluirId) {
    throw new ApiError(409, "CORREO_DUPLICADO", "Ya existe un usuario con ese correo.");
  }
}

export async function listarUsuarios({ q }) {
  const usuarios = await db.usuario.findMany({
    where: q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { correo: { contains: q, mode: "insensitive" } },
            { usuario: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: INCLUDE,
    orderBy: { creadoEn: "desc" },
  });
  return usuarios.map(serializarUsuarioAdmin);
}

// otorgaSuperAdmin: true si quien hace el pedido (req.usuario) YA es
// SuperAdmin — se necesita para decidir si se le permite marcar a
// alguien más como SuperAdmin (ver crearUsuario/actualizarUsuario).
// Nadie sin control total puede otorgárselo a otro, ni a sí mismo.
export async function crearUsuario({ usuario, nombre, correo, esSuperAdmin, modulos, empresas }, otorgaSuperAdmin) {
  if (esSuperAdmin && !otorgaSuperAdmin) {
    throw new ApiError(403, "SIN_PERMISO", "Solo un SuperAdmin puede crear a otro SuperAdmin.");
  }

  await validarUsuarioYCorreoLibres({ usuario, correo, excluirId: null });

  const empresaIds = await empresaIdsPorSlugs(empresas);
  const modulosFinales = esSuperAdmin ? [] : modulosValidos(modulos);
  if (!esSuperAdmin && modulosFinales.length === 0) {
    throw validacionFallida("Selecciona al menos una ventana a la que este usuario pueda acceder.");
  }

  const passwordTemporal = generarPasswordTemporal();
  const passwordHash = await bcrypt.hash(passwordTemporal, RONDAS_BCRYPT);

  const nuevo = await db.usuario.create({
    data: {
      usuario,
      nombre,
      correo,
      esSuperAdmin: !!esSuperAdmin,
      passwordHash,
      empresas: { create: empresaIds.map((empresaId) => ({ empresaId })) },
      modulos: { create: modulosFinales.map((modulo) => ({ modulo })) },
    },
    include: INCLUDE,
  });

  // El usuario ya quedó creado en la base de datos pase lo que pase acá
  // abajo — si el correo falla (SMTP caído, correo mal escrito, etc.),
  // no debe parecer que la creación completa falló. Se avisa con
  // correoEnviado:false para que el frontend pueda mostrar "usuario
  // creado, pero no se pudo avisarle — usa 'Resetear contraseña' para
  // reintentarlo" en vez de un error genérico que oculte que sí quedó.
  let correoEnviado = true;
  try {
    await enviarCorreoPasswordTemporal(correo, nombre, passwordTemporal);
  } catch (err) {
    console.error("No se pudo enviar el correo de bienvenida:", err.message);
    correoEnviado = false;
  }

  return { ...serializarUsuarioAdmin(nuevo), correoEnviado, passwordTemporal };
}

export async function actualizarUsuario(usuarioId, { usuario, nombre, correo, esSuperAdmin, modulos, empresas }, otorgaSuperAdmin) {
  const existente = await buscarPorId(usuarioId);
  if (!existente) throw new ApiError(404, "NO_ENCONTRADO", "El usuario no existe.");

  if (esSuperAdmin && !existente.esSuperAdmin && !otorgaSuperAdmin) {
    throw new ApiError(403, "SIN_PERMISO", "Solo un SuperAdmin puede convertir a otro usuario en SuperAdmin.");
  }
  if (existente.esSuperAdmin && !esSuperAdmin) {
    await verificarNoEsElUltimoSuperAdmin(usuarioId);
  }

  await validarUsuarioYCorreoLibres({ usuario, correo, excluirId: usuarioId });

  const empresaIds = await empresaIdsPorSlugs(empresas);
  const modulosFinales = esSuperAdmin ? [] : modulosValidos(modulos);
  if (!esSuperAdmin && modulosFinales.length === 0) {
    throw validacionFallida("Selecciona al menos una ventana a la que este usuario pueda acceder.");
  }

  // Reemplaza empresas y módulos por completo (borra y vuelve a crear)
  // — más simple y sin casos raros que ir calculando cuáles
  // agregar/quitar una por una.
  const actualizado = await db.$transaction(async (tx) => {
    await tx.usuarioEmpresa.deleteMany({ where: { usuarioId } });
    await tx.usuarioModulo.deleteMany({ where: { usuarioId } });
    return tx.usuario.update({
      where: { id: usuarioId },
      data: {
        usuario,
        nombre,
        correo,
        esSuperAdmin: !!esSuperAdmin,
        empresas: { create: empresaIds.map((empresaId) => ({ empresaId })) },
        modulos: { create: modulosFinales.map((modulo) => ({ modulo })) },
      },
      include: INCLUDE,
    });
  });

  return serializarUsuarioAdmin(actualizado);
}

// Reglas comunes a desactivar y eliminar — se validan acá, en el
// backend, aunque la interfaz ya oculte o deshabilite los botones.
function verificarPuedeGestionar(usuario, solicitante, accion) {
  if (usuario.id === solicitante.id) {
    throw conflicto(`No puedes ${accion}te a ti mismo. Pídele a otro administrador que lo haga.`, "ACCION_SOBRE_SI_MISMO");
  }
  if (usuario.esSuperAdmin && !solicitante.esSuperAdmin) {
    throw new ApiError(403, "SIN_PERMISO", `Solo un SuperAdmin puede ${accion} a otro SuperAdmin.`);
  }
}

export async function cambiarEstadoUsuario(usuarioId, activo, solicitante) {
  const usuario = await buscarPorId(usuarioId);
  if (!usuario) throw new ApiError(404, "NO_ENCONTRADO", "El usuario no existe.");

  // Reactivar no tiene riesgo; desactivar sí (quedarse sin acceso,
  // dejar al sistema sin SuperAdmin), por eso las reglas solo aplican ahí.
  if (!activo) verificarPuedeGestionar(usuario, solicitante, "desactivar");
  if (!activo && usuario.esSuperAdmin) {
    await verificarNoEsElUltimoSuperAdmin(usuarioId);
  }

  const actualizado = await db.usuario.update({
    where: { id: usuarioId },
    data: { activo },
    include: INCLUDE,
  });

  // Si se lo está desactivando, corta cualquier sesión que tenga
  // abierta ahora mismo — no tiene sentido dejarlo seguir renovando su
  // token mientras el refresh token no expire solo.
  if (!activo) await revocarTodosLosRefreshTokens(usuarioId);

  return serializarUsuarioAdmin(actualizado);
}

// Registros que guardan QUIÉN hizo algo y que no se deben perder. Si el
// usuario se borrara, su nombre desaparecería de la hoja de vida de
// equipos y vehículos (onDelete: SetNull → "Sistema").
async function contarRegistrosAsociados(tx, usuarioId) {
  const [historialEquipo, historialVehiculo] = await Promise.all([
    tx.historialEquipo.count({ where: { usuarioId } }),
    tx.historialVehiculo.count({ where: { usuarioId } }),
  ]);
  return historialEquipo + historialVehiculo;
}

// Borrado definitivo. A diferencia de desactivar, no se puede deshacer:
// solo se permite si el usuario no dejó rastro en el historial — si lo
// dejó, se responde 409 para que la interfaz ofrezca desactivarlo.
// No tiene archivos propios en disco (no hay foto de perfil): todo lo
// suyo vive en tablas que se borran acá mismo.
export async function eliminarUsuario(usuarioId, solicitante) {
  const usuario = await buscarPorId(usuarioId);
  if (!usuario) throw new ApiError(404, "NO_ENCONTRADO", "El usuario no existe.");

  verificarPuedeGestionar(usuario, solicitante, "eliminar");
  if (usuario.esSuperAdmin && usuario.activo) {
    const otros = await db.usuario.count({ where: { esSuperAdmin: true, activo: true, id: { not: usuarioId } } });
    if (otros === 0) {
      throw conflicto("No se puede eliminar al último SuperAdmin activo: el sistema se quedaría sin nadie con control total.", "ULTIMO_SUPERADMIN");
    }
  }

  // Serializable: si justo mientras tanto se registra algo a su nombre
  // en el historial, la transacción falla en vez de borrarlo igual.
  await db.$transaction(
    async (tx) => {
      const asociados = await contarRegistrosAsociados(tx, usuarioId);
      if (asociados > 0) {
        throw conflicto(
          `No se puede eliminar a ${usuario.nombre}: tiene ${asociados} ${asociados === 1 ? "registro asociado" : "registros asociados"} en el historial de equipos y vehículos. Puedes desactivarlo en su lugar.`,
          "USUARIO_CON_REGISTROS"
        );
      }
      // Primero lo propio del usuario (aunque la base ya lo haría en
      // cascada, queda explícito qué se borra), y al final el usuario.
      await tx.usuarioEmpresa.deleteMany({ where: { usuarioId } });
      await tx.usuarioModulo.deleteMany({ where: { usuarioId } });
      await tx.refreshToken.deleteMany({ where: { usuarioId } });
      await tx.passwordResetToken.deleteMany({ where: { usuarioId } });
      await tx.pushSubscription.deleteMany({ where: { usuarioId } });
      await tx.usuario.delete({ where: { id: usuarioId } });
    },
    { isolationLevel: "Serializable" }
  );

  return { ok: true };
}

export async function resetearPassword(usuarioId) {
  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw validacionFallida("El usuario no existe.");

  const passwordTemporal = generarPasswordTemporal();
  const passwordHash = await bcrypt.hash(passwordTemporal, RONDAS_BCRYPT);
  await db.usuario.update({ where: { id: usuarioId }, data: { passwordHash } });
  // Con la contraseña anterior ya sin valor, cualquier sesión que
  // siguiera abierta con ella se corta acá.
  await revocarTodosLosRefreshTokens(usuarioId);

  // La contraseña YA cambió en este punto, pase lo que pase con el
  // correo — si el envío falla, el usuario admin necesita saberlo para
  // avisarle la contraseña nueva por otro medio, no un error genérico.
  let correoEnviado = true;
  try {
    await enviarCorreoPasswordTemporal(usuario.correo, usuario.nombre, passwordTemporal);
  } catch (err) {
    console.error("No se pudo enviar el correo de contraseña restablecida:", err.message);
    correoEnviado = false;
  }

  return { ok: true, correoEnviado, passwordTemporal };
}
