import { IconAlertCircle } from "../icons/Icons";
import "./EstadoError.css";

// TODO backend: cuando el backend responda con el sobre uniforme de
// errores { code, message } (punto 1.15 del roadmap), este componente
// puede recibir directamente el `ApiError` de apiClient.js y elegir un
// mensaje amigable según `error.code` (SESION_EXPIRADA, SIN_PERMISO,
// NO_ENCONTRADO, ERROR_SERVIDOR, SIN_CONEXION...) en vez de un texto
// genérico como el de abajo.
const MENSAJE_POR_CODIGO = {
  SIN_CONEXION: "No se pudo conectar con el servidor. Revisa tu conexión.",
  SESION_EXPIRADA: "Tu sesión expiró. Vuelve a iniciar sesión.",
  SIN_PERMISO: "No tienes permiso para ver esta información.",
  NO_ENCONTRADO: "El registro solicitado no existe o fue eliminado.",
  ERROR_SERVIDOR: "Ocurrió un error inesperado en el servidor.",
};

export default function EstadoError({ error, onReintentar, mensaje }) {
  const texto = mensaje || MENSAJE_POR_CODIGO[error?.code] || "Ocurrió un problema al cargar la información.";

  return (
    <div className="estado-error">
      <div className="estado-error__icono">
        <IconAlertCircle width={22} height={22} />
      </div>
      <p className="estado-error__texto">{texto}</p>
      {onReintentar && (
        <button className="btn-outline-sm" type="button" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}
