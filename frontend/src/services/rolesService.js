// Ya no hay un CRUD de "roles" con nombre — cada usuario tiene
// directamente su propio interruptor de SuperAdmin y su propia lista
// de ventanas (ver usuariosService.js). Esta lista de módulos posibles
// sigue viviendo acá porque el formulario de usuario la necesita para
// pintar los checkboxes, y tiene que coincidir con MODULOS_DISPONIBLES
// del backend (lib/roles.js), que es donde de verdad se valida.
export const MODULOS_DISPONIBLES = [
  { id: "dashboard", nombre: "Dashboard" },
  { id: "rrhh", nombre: "RRHH" },
  { id: "operaciones", nombre: "Operaciones" },
  { id: "finanzas", nombre: "Finanzas" },
  { id: "administracion", nombre: "Administración" },
];
