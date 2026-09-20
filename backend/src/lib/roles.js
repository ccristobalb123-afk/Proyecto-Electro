// Los 5 módulos que existen en el sistema — la LISTA de módulos
// posibles es fija en código (son las páginas reales que existen en
// el frontend), pero qué módulos ve CADA USUARIO vive directo en la
// base de datos (tabla UsuarioModulo), sin pasar por un "rol" con
// nombre intermedio.
export const MODULOS_DISPONIBLES = ["dashboard", "rrhh", "operaciones", "finanzas", "administracion"];

// `usuario` acá es el registro ya cargado con su relación `modulos`
// incluida (ver auth.middleware.js, que la carga junto con el usuario
// en cada pedido).
//
// El SuperAdmin es el único caso especial: tiene acceso a TODO sin que
// haga falta guardar una fila en UsuarioModulo por cada módulo — así,
// aunque en el futuro se agregue un módulo nuevo al sistema, el
// SuperAdmin lo ve automáticamente sin tener que editarlo a mano.
export function modulosDe(usuario) {
  if (usuario.esSuperAdmin) return MODULOS_DISPONIBLES;
  return usuario.modulos.map((um) => um.modulo);
}

// Solo el SuperAdmin exige MFA — es el único con control total del
// sistema. Un usuario normal con acceso a Administración (pero sin
// esSuperAdmin) no lo requiere todavía.
export function requiereMfaPorPolitica(usuario) {
  return usuario.esSuperAdmin;
}
