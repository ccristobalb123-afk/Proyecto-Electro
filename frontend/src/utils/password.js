// Largo mínimo de contraseña: el MISMO que exige el backend
// (backend/src/validators/auth.validators.js). Antes "Cambiar contraseña"
// pedía 6 en pantalla y el servidor rechazaba con menos de 8.
export const MIN_LARGO_PASSWORD = 8;
