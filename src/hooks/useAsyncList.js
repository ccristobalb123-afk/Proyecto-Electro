import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Encapsula el patrón que se repetía en cada página (Administración,
 * RRHH, Operaciones, Finanzas, Dashboard...):
 *
 *   const [datos, setDatos] = useState([]);
 *   const [cargando, setCargando] = useState(true);
 *   useEffect(() => {
 *     setCargando(true);
 *     servicio.listar(filtros).then(setDatos).catch(...).finally(...);
 *   }, [filtros]);
 *
 * Uso:
 *   const { data: equipos, loading, error, reload } = useAsyncList(
 *     () => equiposService.listarEquipos({ empresa, categoria, q }),
 *     [empresa, categoria, q]
 *   );
 *
 * `reload()` sirve para refrescar la lista después de crear/editar/
 * eliminar un registro sin duplicar la llamada al service en el handler.
 *
 * Nota: si el componente se desmonta (o las dependencias cambian) antes
 * de que la petición anterior responda, esa respuesta "tardía" se
 * ignora — evita el bug clásico de pisar datos nuevos con una
 * respuesta vieja que llegó fuera de orden.
 */
export function useAsyncList(fetchFn, deps = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const idPeticionRef = useRef(0);

  const cargar = useCallback(() => {
    const idPeticion = ++idPeticionRef.current;
    setLoading(true);
    setError(null);
    fetchFn()
      .then((resultado) => {
        if (idPeticion === idPeticionRef.current) setData(resultado ?? []);
      })
      .catch((err) => {
        if (idPeticion === idPeticionRef.current) {
          setError(err);
          setData([]);
        }
      })
      .finally(() => {
        if (idPeticion === idPeticionRef.current) setLoading(false);
      });
    // `deps` es intencionalmente una lista que decide quien LLAMA al hook
    // (ej. [empresa, categoria, busquedaDebounced] en Operaciones), no
    // variables usadas dentro de este cuerpo — por eso no se puede listar
    // literal acá, y ESLint no tiene forma de verificarlo estáticamente.
    // Esta es la excepción documentada oficialmente por el propio plugin
    // eslint-plugin-react-hooks para hooks genéricos de fetching como
    // este (equivalente a lo que hacen SWR/React Query por dentro). La
    // responsabilidad de listar TODAS las dependencias reales queda del
    // lado de quien usa `useAsyncList`, no de este archivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { data, setData, loading, error, reload: cargar };
}
