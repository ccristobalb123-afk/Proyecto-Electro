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
// Si el aviso de actividad falla (sin red, servidor caído), se reintenta
// solo, con espera creciente; mientras tanto la actividad no manda nada.
const ESPERAS_REINTENTO_MS = [5_000, 10_000, 20_000, 40_000, 60_000];
// Sin conexión o con la pestaña oculta no se intenta: se espera a "online"
// o a que la pestaña vuelva a verse.
const puedeEnviar = () => navigator.onLine !== false && document.visibilityState !== "hidden";

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
  // Estado del aviso de actividad: una sola petición a la vez (enCurso);
  // pendiente = falló o no se pudo enviar y queda un reintento por hacer.
  const latidoRef = useRef({ enCurso: false, pendiente: false, fallos: 0, temporizador: null, cancelado: false });
  const enviarLatidoRef = useRef(null);
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

  // Envía el aviso de actividad. Si falla, programa el reintento (5 s,
  // 10 s, 20 s, 40 s y luego cada 60 s); al primer éxito vuelve la cadencia
  // normal. Antes, tras un fallo, cada evento de actividad (cada tecla,
  // cada scroll) mandaba otra petición al instante.
  const enviarLatido = useCallback(async () => {
    const r = latidoRef.current;
    clearTimeout(r.temporizador);
    r.temporizador = null;
    if (r.enCurso || r.cancelado) return;
    if (!puedeEnviar()) {
      r.pendiente = true; // se reanuda con "online" o visibilitychange
      return;
    }
    r.enCurso = true;
    r.pendiente = false;
    // La marca la ven las demás pestañas: tampoco mandan nada en 30 s.
    marcarLatido(Date.now());
    try {
      const sesion = await authService.registrarActividad();
      r.fallos = 0;
      guardarEstadoServidor(sesion);
      revisar();
    } catch (err) {
      // 401: sesión terminada; apiClient ya avisó el cierre. No se reintenta.
      if (r.cancelado || err?.status === 401) return;
      r.pendiente = true;
      const espera = ESPERAS_REINTENTO_MS[Math.min(r.fallos, ESPERAS_REINTENTO_MS.length - 1)];
      r.fallos += 1;
      r.temporizador = setTimeout(() => enviarLatidoRef.current?.(), espera);
    } finally {
      r.enCurso = false;
    }
  }, [revisar]);
  useEffect(() => {
    enviarLatidoRef.current = enviarLatido;
  });

  // Reporta actividad al servidor (que es quien mueve el plazo).
  // forzar ("Seguir conectado") no espera los 30 s ni el reintento
  // programado, pero tampoco manda una segunda petición si ya hay una.
  const latido = useCallback(
    (forzar) => {
      const r = latidoRef.current;
      if (r.enCurso || (r.pendiente && !forzar)) return;
      const estado = leerEstado();
      if (!forzar && !r.pendiente && estado && Date.now() - (estado.ultimoLatido || 0) < INTERVALO_LATIDO_MS) return;
      return enviarLatido();
    },
    [enviarLatido]
  );

  useEffect(() => {
    if (!activo) {
      avisoVisibleRef.current = false;
      return undefined;
    }
    expiradoRef.current = false;
    avisoMaximaDadoRef.current = false;
    const estadoLatido = { enCurso: false, pendiente: false, fallos: 0, temporizador: null, cancelado: false };
    latidoRef.current = estadoLatido;

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
    // Reintento que quedó esperando la conexión o la visibilidad.
    function alReanudar() {
      if (estadoLatido.pendiente && !estadoLatido.temporizador && puedeEnviar()) enviarLatido();
    }
    function alVolver() {
      if (document.visibilityState === "visible") {
        revisar();
        alReanudar();
      }
    }

    EVENTOS_ACTIVIDAD.forEach((ev) => window.addEventListener(ev, alActuar, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", revisar);
    window.addEventListener("pageshow", revisar);
    window.addEventListener("online", alReanudar);
    const dejarDeEscuchar = escucharOtrasPestañas({ onCambio: revisar });
    const intervalo = setInterval(revisar, REVISION_MS);
    revisar();

    return () => {
      EVENTOS_ACTIVIDAD.forEach((ev) => window.removeEventListener(ev, alActuar, { capture: true }));
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", revisar);
      window.removeEventListener("pageshow", revisar);
      window.removeEventListener("online", alReanudar);
      estadoLatido.cancelado = true;
      clearTimeout(estadoLatido.temporizador);
      dejarDeEscuchar();
      clearInterval(intervalo);
    };
  }, [activo, latido, enviarLatido, revisar]);

  const seguirConectado = useCallback(() => latido(true), [latido]);

  return { segundosRestantes: activo ? segundosRestantes : null, seguirConectado };
}
