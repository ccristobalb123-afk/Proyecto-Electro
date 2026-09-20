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

export const OPCIONES_COOKIE_ACCESS = {
  httpOnly: true,
  secure: enProduccion,
  sameSite: "lax",
  path: "/",
  maxAge: 15 * 60 * 1000, // 15 min — debe coincidir con JWT_ACCESS_EXPIRES_IN
};

export const OPCIONES_COOKIE_REFRESH = {
  httpOnly: true,
  secure: enProduccion,
  sameSite: "lax",
  path: "/api/auth", // el refresh token solo se envía a rutas de auth, no a toda la app
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días — debe coincidir con JWT_REFRESH_EXPIRES_IN
};

export const NOMBRE_COOKIE_ACCESS = "electro_access";
export const NOMBRE_COOKIE_REFRESH = "electro_refresh";
