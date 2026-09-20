import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Controla y mitiga el abandono de sesiones de usuario de manera asíncrona.
 * Avisa mediante un contador visual antes de destruir el token de acceso.
 *
 * @param {Object} opciones
 * @param {number} [opciones.tiempoInactividadMinutos=30] - Minutos totales de tolerancia.
 * @param {number} [opciones.tiempoAvisoMinutos=1] - Ventana de tiempo previa para notificar al usuario.
 * @param {Function} opciones.onCerrarSesion - Callback de destrucción de sesión.
 * @param {boolean} opciones.activo - Flag de inicialización (ej: true si el usuario está autenticado).
 */
export function useInactividad({
  tiempoInactividadMinutos = 30,
  tiempoAvisoMinutos = 1,
  onCerrarSesion,
  activo
}) {
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(tiempoAvisoMinutos * 60);

  const timeoutAvisoRef = useRef(null);
  const timeoutCierreRef = useRef(null);
  const intervalRef = useRef(null);
  const ultimaActividadRef = useRef(0); // Controla el estrangulamiento (throttle) de eventos de entrada

  // Guardamos las referencias de las callbacks dinámicas para evitar re-suscripciones cíclicas en el useEffect
  const onCerrarSesionRef = useRef(onCerrarSesion);
  onCerrarSesionRef.current = onCerrarSesion;

  /**
   * Destruye de forma segura todos los hilos y loops asíncronos activos.
   */
  const limpiarTimers = useCallback(() => {
    if (timeoutAvisoRef.current) clearTimeout(timeoutAvisoRef.current);
    if (timeoutCierreRef.current) clearTimeout(timeoutCierreRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  /**
   * Inicializa o restablece los temporizadores de inactividad a su estado original.
   */
  const reiniciarTimers = useCallback(() => {
    limpiarTimers();
    setMostrarAviso(false);

    const segundosTotalesAviso = tiempoAvisoMinutos * 60;
    setSegundosRestantes(segundosTotalesAviso);

    const msHastaAviso = Math.max((tiempoInactividadMinutos - tiempoAvisoMinutos) * 60 * 1000, 0);

    // 1. Temporizador para disparar la alerta en UI
    timeoutAvisoRef.current = setTimeout(() => {
      setMostrarAviso(true);
      let segundos = segundosTotalesAviso;

      intervalRef.current = setInterval(() => {
        segundos -= 1;
        setSegundosRestantes(segundos);
        if (segundos <= 0) {
          clearInterval(intervalRef.current);
        }
      }, 1000);
    }, msHastaAviso);

    // 2. Temporizador crítico para la desconexión total
    timeoutCierreRef.current = setTimeout(() => {
      limpiarTimers();
      if (onCerrarSesionRef.current) onCerrarSesionRef.current();
    }, tiempoInactividadMinutos * 60 * 1000);
  }, [tiempoInactividadMinutos, tiempoAvisoMinutos, limpiarTimers]);

  useEffect(() => {
    if (!activo) {
      limpiarTimers();
      setMostrarAviso(false);
      return;
    }

    reiniciarTimers();

    const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    /**
     * Manejador optimizado con compresión de eventos.
     * Evita re-calcular y re-escribir memoria si los eventos ocurren en ráfagas de menos de 1 segundo.
     */
    const handleActividad = () => {
      const ahora = Date.now();
      if (ahora - ultimaActividadRef.current > 1000) {
        ultimaActividadRef.current = ahora;
        reiniciarTimers();
      }
    };

    eventos.forEach((ev) => window.addEventListener(ev, handleActividad, { passive: true }));

    return () => {
      limpiarTimers();
      eventos.forEach((ev) => window.removeEventListener(ev, handleActividad));
    };
  }, [activo, reiniciarTimers, limpiarTimers]);

  return {
    mostrarAviso,
    segundosRestantes,
    seguirConectado: reiniciarTimers
  };
}