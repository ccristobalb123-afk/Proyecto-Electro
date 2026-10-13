import { useCallback, useEffect, useRef, useState } from "react";
import * as authService from "../services/authService";
import { escucharOtrasPestañas, guardarEstadoServidor, leerEstado, marcarLatido } from "../services/sesionCompartida";

// Lo que cuenta como "el usuario está ahí". El movimiento del mouse no:
// un mouse que se mueve solo (o al rozar la mesa) no debe mantener
// abierta una sesión en un equipo desatendido.
const EVENTOS_ACTIVIDAD = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"];
// Como mucho un aviso de actividad al servidor cada 30 s (entre todas las
// pestañas): el plazo del servidor queda a lo sumo 30 s detrás.
const INTERVALO_LATIDO_MS = 30_000;
const REVISION_MS = 1000;
// Aviso previo (no bloqueante) antes del límite absoluto de la sesión.
const AVISO_MAXIMA_MS = 5 * 60_000;

/**
 * Cierre de sesión por inactividad y por duración máxima.
 *
 * Funciona con MARCAS DE TIEMPO, no con temporizadores que cuentan hacia
 * atrás: con la app en segundo plano o la pantalla bloqueada el
 * navegador pausa los temporizadores, pero al volver (visibilitychange)
 * se compara la hora actual con la fecha límite y se cierra en el acto
 * si ya pasó. Las fechas límite las da el servidor, que es quien de
 * verdad rechaza la sesión vencida.
 *
 * @param {Object} opciones
 * @param {boolean} opciones.activo - true si hay sesión.
 * @param {(motivo: "inactividad"|"maxima") => void} opciones.onExpirar
 * @param {() => void} [opciones.onCercaDelMaximo] - 5 min antes del límite absoluto.
 * @returns {{ segundosRestantes: number|null, seguirConectado: () => Promise<void> }}
 *   segundosRestantes: null mientras no corresponda mostrar el aviso.
 */
export function useInactividad({ activo, onExpirar, onCercaDelMaximo }) {
  const [segundosRestantes, setSegundosRestantes] = useState(null);
  const avisoVisibleRef = useRef(false);
  const expiradoRef = useRef(false);
  const avisoMaximaDadoRef = useRef(false);
  const onExpirarRef = useRef(onExpirar);
  const onCercaDelMaximoRef = useRef(onCercaDelMaximo);
  useEffect(() => {
    onExpirarRef.current = onExpirar;
    onCercaDelMaximoRef.current = onCercaDelMaximo;
  });

  const revisar = useCallback(() => {
    const estado = leerEstado();
    if (!estado || expiradoRef.current) return;
    const ahora = Date.now();
    let motivo = null;
    if (ahora >= estado.absolutaHasta) motivo = "maxima";
    else if (ahora >= estado.inactividadHasta) motivo = "inactividad";
    if (motivo) {
      expiradoRef.current = true;
      avisoVisibleRef.current = false;
      setSegundosRestantes(null);
      onExpirarRef.current?.(motivo);
      return;
    }
    if (!avisoMaximaDadoRef.current && estado.absolutaHasta - ahora <= AVISO_MAXIMA_MS) {
      avisoMaximaDadoRef.current = true;
      onCercaDelMaximoRef.current?.();
    }
    const restante = estado.inactividadHasta - ahora;
    const mostrar = restante <= estado.avisoMs;
    avisoVisibleRef.current = mostrar;
    setSegundosRestantes(mostrar ? Math.ceil(restante / 1000) : null);
  }, []);

  // Reporta actividad al servidor (que es quien mueve el plazo).
  const latido = useCallback(
    async (forzar) => {
      const estado = leerEstado();
      const ahora = Date.now();
      if (!forzar && estado && ahora - (estado.ultimoLatido || 0) < INTERVALO_LATIDO_MS) return;
      marcarLatido(ahora);
      try {
        guardarEstadoServidor(await authService.registrarActividad());
        revisar();
      } catch {
        // 401: apiClient ya avisó el cierre. Sin conexión: se reintenta
        // con la próxima actividad (el aviso sigue a la vista si corresponde).
        marcarLatido(0);
      }
    },
    [revisar]
  );

  useEffect(() => {
    if (!activo) {
      avisoVisibleRef.current = false;
      return undefined;
    }
    expiradoRef.current = false;
    avisoMaximaDadoRef.current = false;

    // Al montar (por ejemplo tras un F5) se piden las fechas al servidor;
    // no cuenta como actividad.
    authService
      .obtenerEstadoSesion()
      .then((sesion) => {
        guardarEstadoServidor(sesion);
        revisar();
      })
      .catch(() => {});

    function alActuar() {
      // Con el aviso a la vista solo cuenta "Seguir conectado": un toque
      // accidental en el bolsillo no debe mantener la sesión abierta.
      if (avisoVisibleRef.current) return;
      latido(false);
    }
    function alVolver() {
      if (document.visibilityState === "visible") revisar();
    }

    EVENTOS_ACTIVIDAD.forEach((ev) => window.addEventListener(ev, alActuar, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", revisar);
    window.addEventListener("pageshow", revisar);
    const dejarDeEscuchar = escucharOtrasPestañas({ onCambio: revisar });
    const intervalo = setInterval(revisar, REVISION_MS);
    revisar();

    return () => {
      EVENTOS_ACTIVIDAD.forEach((ev) => window.removeEventListener(ev, alActuar, { capture: true }));
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", revisar);
      window.removeEventListener("pageshow", revisar);
      dejarDeEscuchar();
      clearInterval(intervalo);
    };
  }, [activo, latido, revisar]);

  const seguirConectado = useCallback(() => latido(true), [latido]);

  return { segundosRestantes: activo ? segundosRestantes : null, seguirConectado };
}
