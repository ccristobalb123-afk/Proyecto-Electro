import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hermano de useAsyncList, pero para cuando lo que se trae NO es una
 * lista (KPIs, un resumen, un comparativo) — la diferencia principal
 * es el valor inicial (`null` en vez de `[]`), todo lo demás es el
 * mismo patrón: loading/error/reload, y se ignoran las respuestas que
 * llegan tarde si mientras tanto cambiaron las dependencias.
 *
 * Uso:
 *   const { data: kpis, loading, error, reload } = useAsync(
 *     () => dashboardService.obtenerKpis()
 *   );
 */
export function useAsync(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const idPeticionRef = useRef(0);

  const cargar = useCallback(() => {
    const idPeticion = ++idPeticionRef.current;
    setLoading(true);
    setError(null);
    fetchFn()
      .then((resultado) => {
        if (idPeticion === idPeticionRef.current) setData(resultado);
      })
      .catch((err) => {
        if (idPeticion === idPeticionRef.current) {
          setError(err);
          setData(null);
        }
      })
      .finally(() => {
        if (idPeticion === idPeticionRef.current) setLoading(false);
      });
    // Ver la nota equivalente en useAsyncList.js sobre por qué `deps`
    // no se puede listar literal acá.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { data, loading, error, reload: cargar };
}
