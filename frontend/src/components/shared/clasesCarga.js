/**
 * Pantalla de carga a pantalla completa (mientras se resuelve la sesión o se
 * descarga una pantalla): spinner y texto centrados. Alto 100vh, o 100dvh
 * donde existe (en el celular no queda tapada por la barra del navegador).
 * Antes .pantalla-cargando-sesion en tokens.css.
 */
export const PANTALLA_CARGANDO = "flex h-screen items-center justify-center gap-3 text-[14px] text-muted supports-[height:100dvh]:h-dvh";
