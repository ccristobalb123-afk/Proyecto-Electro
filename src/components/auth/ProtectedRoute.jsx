import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Envuelve una página que requiere sesión. Uso:
 *   <ProtectedRoute modulo="finanzas"><Finanzas /></ProtectedRoute>
 *
 * - Sin sesión → redirige a /login (recordando a dónde iba, para volver
 *   ahí después de iniciar sesión).
 * - Con sesión pero sin acceso al módulo (según su rol) → redirige a
 *   /dashboard, sin mostrar ni un parpadeo del contenido protegido.
 *
 * IMPORTANTE (punto 1.5 del roadmap): esto es solo experiencia de
 * usuario en el frontend. El backend SIEMPRE debe volver a validar la
 * sesión y el permiso en cada endpoint — un `ProtectedRoute` nunca
 * sustituye esa validación del lado servidor.
 */
export function ProtectedRoute({ modulo, children }) {
  const { estaAutenticado, cargandoSesion, tieneAcceso } = useAuth();
  const location = useLocation();

  if (cargandoSesion) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--muted)", fontSize: 14 }}>
        Cargando sesión...
      </div>
    );
  }

  if (!estaAutenticado) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (modulo && !tieneAcceso(modulo)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/** Envuelve /login: si ya hay sesión activa, no tiene sentido ver el login de nuevo. */
export function RutaPublicaSoloInvitado({ children }) {
  const { estaAutenticado, cargandoSesion } = useAuth();
  if (cargandoSesion) return null;
  if (estaAutenticado) return <Navigate to="/dashboard" replace />;
  return children;
}
