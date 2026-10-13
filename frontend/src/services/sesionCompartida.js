// ============================================================
// Estado de la sesión compartido entre pestañas del mismo navegador.
//
// Guarda solo FECHAS (cuándo vence por inactividad y cuándo vence por la
// duración máxima), nunca tokens: los tokens viven en cookies httpOnly
// que JavaScript no puede leer. El servidor es quien decide de verdad;
// esto sirve para la cuenta regresiva, para que la actividad en una
// pestaña cuente para todas y para que cerrar en una cierre las demás.
//
// Las fechas se guardan en el reloj de ESTE equipo: se corrigen con la
// diferencia respecto del reloj del servidor (un celular con la hora mal
// puesta no adelanta ni atrasa el cierre).
//
// localStorage puede no estar disponible (modo privado estricto,
// almacenamiento bloqueado): en ese caso se usa memoria y cada pestaña
// funciona por su cuenta.
// ============================================================

const CLAVE_ESTADO = "electro_sesion";
const CLAVE_CIERRE = "electro_sesion_cierre";

let enMemoria = null;

function leer(clave) {
  try {
    const valor = localStorage.getItem(clave);
    return valor ? JSON.parse(valor) : null;
  } catch {
    return clave === CLAVE_ESTADO ? enMemoria : null;
  }
}

function escribir(clave, valor) {
  if (clave === CLAVE_ESTADO) enMemoria = valor;
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento: queda solo en memoria.
  }
}

/** { inactividadHasta, absolutaHasta, avisoMs, ultimoLatido } en el reloj local, o null. */
export function leerEstado() {
  return leer(CLAVE_ESTADO);
}

/** Guarda las fechas que mandó el servidor (respuesta de login, refresh o actividad). */
export function guardarEstadoServidor(sesion) {
  if (!sesion?.ahora) return;
  const desfase = Date.now() - sesion.ahora;
  escribir(CLAVE_ESTADO, {
    inactividadHasta: sesion.expiraInactividadEn + desfase,
    absolutaHasta: sesion.expiraAbsolutaEn + desfase,
    avisoMs: (sesion.avisoSegundos ?? 120) * 1000,
    ultimoLatido: leerEstado()?.ultimoLatido ?? 0,
  });
}

/** Momento del último aviso de actividad enviado al servidor (desde cualquier pestaña). */
export function marcarLatido(momento) {
  const estado = leerEstado();
  if (estado) escribir(CLAVE_ESTADO, { ...estado, ultimoLatido: momento });
}

/** Avisa a las demás pestañas que la sesión se cerró, y por qué. */
export function anunciarCierre(motivo) {
  escribir(CLAVE_ESTADO, null);
  escribir(CLAVE_CIERRE, { motivo: motivo || null, momento: Date.now() });
}

/**
 * Escucha lo que pasa en OTRAS pestañas (el evento "storage" no llega a
 * la pestaña que hizo el cambio).
 *   onCierre(motivo): otra pestaña cerró la sesión.
 *   onCambio(estado): otra pestaña registró actividad, renovó o inició sesión.
 */
export function escucharOtrasPestañas({ onCierre, onCambio }) {
  function alCambiar(e) {
    if (e.key === CLAVE_CIERRE && e.newValue) {
      try {
        onCierre?.(JSON.parse(e.newValue).motivo);
      } catch {
        onCierre?.(null);
      }
    } else if (e.key === CLAVE_ESTADO && e.newValue) {
      onCambio?.(leerEstado());
    }
  }
  window.addEventListener("storage", alCambiar);
  return () => window.removeEventListener("storage", alCambiar);
}
