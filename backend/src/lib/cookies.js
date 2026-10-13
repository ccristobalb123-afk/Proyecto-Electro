// httpOnly: JavaScript del navegador (incluido un XSS) no puede leer
// esta cookie — es la razón principal por la que esto es más seguro
// que guardar el token en localStorage, que sí es legible por
// cualquier script que corra en la página.
//
// secure: true en producción exige HTTPS para enviar la cookie. En
// desarrollo (localhost sin HTTPS) lo dejamos en false o el navegador
// simplemente no la manda nunca.
//
// sameSite: "lax" alcanza para este caso (frontend y backend en el
// mismo sitio o subdominios relacionados). Si en producción terminan
// en dominios totalmente distintos, hay que pasar a "none" + secure:true.
const enProduccion = process.env.NODE_ENV === "production";

// Opciones base (sin duración): sirven también para borrarlas con
// clearCookie, que necesita el mismo path pero NO un maxAge (con maxAge,
// Express 4 vuelve a poner la cookie en vez de borrarla).
export const OPCIONES_COOKIE_ACCESS = {
  httpOnly: true,
  secure: enProduccion,
  sameSite: "lax",
  path: "/",
};

export const OPCIONES_COOKIE_REFRESH = {
  httpOnly: true,
  secure: enProduccion,
  sameSite: "lax",
  path: "/api/auth", // el refresh token solo se envía a rutas de auth, no a toda la app
};

export const NOMBRE_COOKIE_ACCESS = "electro_access";
export const NOMBRE_COOKIE_REFRESH = "electro_refresh";

// Las cookies vencen junto con sus tokens: la de acceso a los 15 min
// (o antes, si la sesión llega antes a su máximo) y la del refresh token
// en la fecha ABSOLUTA de fin de la sesión, que no se mueve al renovar.
export function ponerCookiesDeSesion(res, { accessToken, accessMs, refreshToken, expiraAbsolutaEn }) {
  res.cookie(NOMBRE_COOKIE_ACCESS, accessToken, { ...OPCIONES_COOKIE_ACCESS, maxAge: accessMs });
  res.cookie(NOMBRE_COOKIE_REFRESH, refreshToken, { ...OPCIONES_COOKIE_REFRESH, expires: expiraAbsolutaEn });
}

export function borrarCookiesDeSesion(res) {
  res.clearCookie(NOMBRE_COOKIE_ACCESS, OPCIONES_COOKIE_ACCESS);
  res.clearCookie(NOMBRE_COOKIE_REFRESH, OPCIONES_COOKIE_REFRESH);
}
