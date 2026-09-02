import { useEffect, useMemo, useState } from "react";

/**
 * Paginación simple sobre una lista ya cargada en memoria. El día que
 * el backend pagine de verdad (punto 1.16 del roadmap: no traer miles
 * de registros de una sola vez), este mismo hook cambia de forma
 * mínima: en vez de recortar `items` acá, `pagina`/`porPagina` se pasan
 * como parámetros al service (`listarFacturas({ page, pageSize })`) y
 * `total` viene de la respuesta del backend en vez de `items.length`.
 *
 * Uso:
 *   const paginacion = usePaginacion(facturasFiltradas, 10);
 *   {paginacion.itemsPagina.map(...)}
 *   <button onClick={paginacion.anterior} disabled={!paginacion.tieneAnterior}>Anterior</button>
 *   <span>Página {paginacion.pagina} de {paginacion.totalPaginas}</span>
 *   <button onClick={paginacion.siguiente} disabled={!paginacion.tieneSiguiente}>Siguiente</button>
 */
export function usePaginacion(items, porPagina = 10) {
  const [pagina, setPagina] = useState(1);

  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));

  // Si cambia el filtro y la lista se achica, evita quedar "varado" en
  // una página que ya no existe (ej. estabas en la página 4 de 4 y el
  // nuevo filtro solo da 1 página).
  useEffect(() => {
    if (pagina > totalPaginas) setPagina(1);
  }, [totalPaginas, pagina]);

  const itemsPagina = useMemo(() => {
    const inicio = (pagina - 1) * porPagina;
    return items.slice(inicio, inicio + porPagina);
  }, [items, pagina, porPagina]);

  return {
    pagina,
    totalPaginas,
    itemsPagina,
    total: items.length,
    tieneAnterior: pagina > 1,
    tieneSiguiente: pagina < totalPaginas,
    anterior: () => setPagina((p) => Math.max(1, p - 1)),
    siguiente: () => setPagina((p) => Math.min(totalPaginas, p + 1)),
    irA: (n) => setPagina(Math.min(Math.max(1, n), totalPaginas)),
  };
}
