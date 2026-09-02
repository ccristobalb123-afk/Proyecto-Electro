import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as authService from "../services/authService";
import { onSesionExpirada } from "../services/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // "cargando": todavía no sabemos si hay sesión (evita parpadeo al
  // login al recargar la página). "listo": ya se resolvió, con o sin sesión.
  const [estado, setEstado] = useState("cargando");
  const [avisoExpirada, setAvisoExpirada] = useState(false);

  // Al montar la app una sola vez: intenta recuperar la sesión activa
  // (por ejemplo tras un F5), sin pedirle nada al usuario.
  useEffect(() => {
    authService
      .obtenerUsuarioActual()
      .then((u) => setUsuario(u))
      .catch(() => setUsuario(null))
      .finally(() => setEstado("listo"));
  }, []);

  // Si cualquier llamada a la API responde 401, apiClient avisa acá.
  // Limpiamos la sesión y mostramos el aviso — el <ProtectedRoute>
  // se encarga de mandar al login al ver que `usuario` quedó en null.
  useEffect(() => {
    return onSesionExpirada(() => {
      setUsuario(null);
      setAvisoExpirada(true);
    });
  }, []);

  const login = useCallback(async (correo, clave) => {
    const resultado = await authService.login(correo, clave);
    if (!resultado.requiereMfa) setUsuario(resultado.usuario);
    return resultado;
  }, []);

  const verificarMfa = useCallback(async (correo, codigo) => {
    const resultado = await authService.verificarMfa(correo, codigo);
    setUsuario(resultado.usuario);
    return resultado;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUsuario(null);
  }, []);

  // Los módulos permitidos vienen del backend en `usuario.modulos` (según
  // su rol) — el frontend no decide esto por su cuenta, solo lo lee.
  // Recordar (punto 1.5 del roadmap): esto SOLO controla qué se muestra;
  // el backend debe volver a validar el rol en cada endpoint sensible.
  function tieneAcceso(modulo) {
    if (!usuario) return false;
    return (usuario.modulos || []).includes(modulo);
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        estaAutenticado: !!usuario,
        cargandoSesion: estado === "cargando",
        avisoExpirada,
        limpiarAvisoExpirada: () => setAvisoExpirada(false),
        login,
        verificarMfa,
        logout,
        tieneAcceso,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook para leer la sesión desde cualquier componente. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un <AuthProvider>");
  }
  return context;
}
