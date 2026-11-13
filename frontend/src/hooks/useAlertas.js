import { useLayoutEffect, useSyncExternalStore } from "react";
import * as notificacionesService from "../services/notificacionesService";

/**
 * Avisos de vencimiento (/dashboard/alertas) compartidos por la campana
 * (NotificacionesBell, en DefaultTopbarExtra; hoy solo la usa el Dashboard)
 * y el panel "Vencimientos" y el KPI "Alertas pendientes" del Dashboard.
 *
 * Antes cada uno los pedía por su lado: al abrir el Dashboard salían dos
 * peticiones iguales a la vez. Ahora quien monta llama a recargarAlertas()
 * y, si ya hay una petición en curso, se suma a esa: una sola por visita.
 * Una página que use la campana sola la pide igual que antes.
 *
 * Igual que antes con useAsyncList, cada visita vuelve a pedirlos y
 * empieza vacía mientras cargan: así nunca se ven avisos de una visita
 * anterior ni de otra sesión.
 */
let estado = { data: [], loading: true, error: null };
let enCurso = null;
const oyentes = new Set();

function fijar(cambios) {
  estado = { ...estado, ...cambios };
  oyentes.forEach((avisar) => avisar());
}

/** Vuelve a pedir los avisos (o se suma a la petición en curso). */
export function recargarAlertas() {
  if (enCurso) return enCurso;
  fijar({ data: [], loading: true, error: null });
  enCurso = notificacionesService
    .listarAlertas()
    .then((data) => fijar({ data: data ?? [], loading: false }))
    .catch((error) => fijar({ data: [], error, loading: false }))
    .finally(() => {
      enCurso = null;
    });
  return enCurso;
}

function suscribir(avisar) {
  oyentes.add(avisar);
  return () => oyentes.delete(avisar);
}

const leer = () => estado;

/** { data, loading, error, reload }: pide los avisos al montarse. */
export function useAlertas() {
  const { data, loading, error } = useSyncExternalStore(suscribir, leer);
  // Antes de pintar: así el primer cuadro ya sale "cargando" y no con los
  // avisos de la visita anterior.
  useLayoutEffect(() => {
    recargarAlertas();
  }, []);
  return { data, loading, error, reload: recargarAlertas };
}
