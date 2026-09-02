import { useEffect, useState } from "react";

/**
 * Devuelve una versión "retrasada" del valor: solo se actualiza cuando
 * el valor original deja de cambiar por `delayMs` milisegundos.
 *
 * Uso típico — evitar una petición al backend por cada tecla escrita
 * en un buscador (punto 1.17 del roadmap):
 *
 *   const [busqueda, setBusqueda] = useState("");
 *   const busquedaDebounced = useDebounce(busqueda, 400);
 *   useEffect(() => { listarAlgo({ q: busquedaDebounced }) }, [busquedaDebounced]);
 *
 * El input se actualiza al instante (setBusqueda en cada tecla, UI
 * fluida), pero la llamada al backend espera a que la persona deje de
 * tipear por 400ms.
 */
export function useDebounce(valor, delayMs = 400) {
  const [valorDebounced, setValorDebounced] = useState(valor);

  useEffect(() => {
    const timeoutId = setTimeout(() => setValorDebounced(valor), delayMs);
    return () => clearTimeout(timeoutId);
  }, [valor, delayMs]);

  return valorDebounced;
}
