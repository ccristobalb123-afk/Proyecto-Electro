import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import * as authService from "../services/authService";
import * as pushService from "../services/pushService";
import { onSesionExpirada } from "../services/apiClient";
import { anunciarCierre, escucharOtrasPestañas, guardarEstadoServidor } from "../services/sesionCompartida";

const AuthContext = createContext(null);

// Código del servidor → motivo que muestra el login.
const MOTIVO_POR_CODIGO = {
  SESION_INACTIVA: "inactividad",
  SESION_MAXIMA: "maxima",
  SESION_REVOCADA: "revocada",
};

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // "cargando": todavía no sabemos si hay sesión (evita parpadeo al
  // login al recargar la página). "listo": ya se resolvió, con o sin sesión.
  const [estado, setEstado] = useState("cargando");
  // Por qué se cerró la sesión ("inactividad", "maxima", "revocada",
  // "expirada"), para explicarlo en el login. null = cerró el usuario.
  const [motivoCierre, setMotivoCierre] = useState(null);
  // Para los listeners de abajo (se registran una sola vez).
  const usuarioRef = useRef(null);
  useEffect(() => {
    usuarioRef.current = usuario;
  }, [usuario]);

  // Deja la sesión cerrada en ESTA pestaña. <ProtectedRoute> se encarga
  // de mandar al login al ver que `usuario` quedó en null.
  const terminarLocal = useCallback((motivo) => {
    setUsuario(null);
    setMotivoCierre(motivo || null);
  }, []);

  // Al montar la app una sola vez: intenta recuperar la sesión activa
  // (por ejemplo tras un F5), sin pedirle nada al usuario.
  useEffect(() => {
    authService
      .obtenerUsuarioActual()
      .then((u) => setUsuario(u))
      .catch(() => setUsuario(null))
      .finally(() => setEstado("listo"));
  }, []);

  // El servidor cerró la sesión (inactividad, 12 h, revocada, o venció y
  // no se pudo renovar): se cierra acá y en las demás pestañas.
  useEffect(() => {
    return onSesionExpirada((code) => {
      const motivo = MOTIVO_POR_CODIGO[code] || "expirada";
      if (usuarioRef.current) anunciarCierre(motivo);
      terminarLocal(motivo);
    });
  }, [terminarLocal]);

  // Sincronización entre pestañas: cerrar en una cierra todas, e iniciar
  // sesión en una la abre en las que estaban en el login.
  useEffect(() => {
    return escucharOtrasPestañas({
      onCierre: (motivo) => {
        if (usuarioRef.current) terminarLocal(motivo === "usuario" ? null : motivo);
      },
      onCambio: () => {
        if (!usuarioRef.current) {
          authService.obtenerUsuarioActual().then((u) => {
            if (u) {
              setMotivoCierre(null);
              setUsuario(u);
            }
          });
        }
      },
    });
  }, [terminarLocal]);

  function sesionIniciada(resultado) {
    guardarEstadoServidor(resultado.sesion);
    setMotivoCierre(null);
    setUsuario(resultado.usuario);
    // Si este navegador ya tenía las notificaciones activadas, vuelven a
    // quedar asociadas a esta sesión.
    pushService.revincularSuscripcion();
  }

  const login = useCallback(async (nombreUsuario, clave) => {
    const resultado = await authService.login(nombreUsuario, clave);
    if (!resultado.requiereMfa) sesionIniciada(resultado);
    return resultado;
  }, []);

  const verificarMfa = useCallback(async (mfaToken, codigo) => {
    const resultado = await authService.verificarMfa(mfaToken, codigo);
    sesionIniciada(resultado);
    return resultado;
  }, []);

  /**
   * Cierra la sesión en el servidor y en todas las pestañas.
   * motivo "usuario" (botón Cerrar sesión): además deja de enviar
   * notificaciones push a este dispositivo. "inactividad" / "maxima":
   * cierre automático, conserva los avisos de vencimientos.
   */
  const cerrarSesion = useCallback(
    async (motivo = "usuario") => {
      const pushEndpoint = motivo === "usuario" ? await pushService.endpointDeEsteDispositivo() : undefined;
      await authService.logout({ motivo, pushEndpoint });
      anunciarCierre(motivo);
      terminarLocal(motivo === "usuario" ? null : motivo);
    },
    [terminarLocal]
  );

  const logout = useCallback(() => cerrarSesion("usuario"), [cerrarSesion]);

  // Después de "cerrar sesión en todos los dispositivos" o de cerrar este
  // desde la lista: el servidor ya la cerró, solo falta hacerlo acá.
  const sesionCerradaEnServidor = useCallback(() => {
    anunciarCierre("usuario");
    terminarLocal(null);
  }, [terminarLocal]);

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
        motivoCierre,
        limpiarMotivoCierre: () => setMotivoCierre(null),
        login,
        verificarMfa,
        logout,
        cerrarSesion,
        sesionCerradaEnServidor,
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
