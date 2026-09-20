import { db } from "../lib/db.js";
import { modulosDe } from "../lib/roles.js";

function iniciales(nombre) {
  return nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const INCLUDE_MODULOS = { modulos: true };

// Convierte el registro de Prisma (con password_hash y mfa_secret
// adentro) en el objeto público que el frontend espera — exactamente
// el mismo shape que devolvía sanear() en el mock de authService.js,
// para no tener que tocar el AuthContext ni ninguna página al conectar
// el backend real.
export function serializarUsuario(usuario) {
  return {
    id: usuario.id,
    usuario: usuario.usuario,
    correo: usuario.correo,
    nombre: usuario.nombre,
    iniciales: iniciales(usuario.nombre),
    esSuperAdmin: usuario.esSuperAdmin,
    empresas: usuario.empresas.map((ue) => ue.empresa.nombre),
    requiereMfa: usuario.mfaHabilitado,
    modulos: modulosDe(usuario),
  };
}

// Para el módulo de Administración (lista y formularios de usuarios):
// el frontend ahí compara/edita empresas por SLUG ("corevex"/"electro",
// ver Administracion.jsx: fUsuario.empresas.includes("corevex")), no
// por nombre completo como en el usuario ya logueado — son dos
// consumidores distintos del mismo dato, cada uno con la forma que
// necesita.
export function serializarUsuarioAdmin(usuario) {
  return {
    id: usuario.id,
    usuario: usuario.usuario,
    nombre: usuario.nombre,
    correo: usuario.correo,
    esSuperAdmin: usuario.esSuperAdmin,
    modulos: modulosDe(usuario),
    empresas: usuario.empresas.map((ue) => ue.empresa.slug),
    activo: usuario.activo,
  };
}

// Se usa para el LOGIN — el nombre de usuario, no el correo.
export async function buscarPorNombreUsuario(nombreUsuario) {
  return db.usuario.findUnique({
    where: { usuario: nombreUsuario.toLowerCase() },
    include: { empresas: { include: { empresa: true } }, ...INCLUDE_MODULOS },
  });
}

// Se usa SOLO para "olvidé mi contraseña" — el correo nunca sirve para
// iniciar sesión, solo para recuperarla.
export async function buscarPorCorreo(correo) {
  return db.usuario.findUnique({
    where: { correo: correo.toLowerCase() },
    include: { empresas: { include: { empresa: true } }, ...INCLUDE_MODULOS },
  });
}

export async function buscarPorId(id) {
  return db.usuario.findUnique({
    where: { id },
    include: { empresas: { include: { empresa: true } }, ...INCLUDE_MODULOS },
  });
}
