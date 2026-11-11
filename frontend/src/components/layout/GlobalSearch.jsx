import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconSearch } from "../icons/Icons";
import * as equiposService from "../../services/equiposService";
import * as vehiculosService from "../../services/vehiculosService";
import * as contratosService from "../../services/contratosService";
import { useDebounce } from "../../hooks/useDebounce";

/* Estilos con Tailwind (ver docs/tailwind.md). "search" y "global-search"
   son ganchos de responsive.css (alto táctil de 44px de la caja y del
   campo); el "outline: none" del campo está en styles/foco.css. En
   celular (max-md:, ≤640px) el buscador no se muestra. El foco del campo
   se dibuja en la caja (focus-within:). */
const CAJA = `search global-search relative flex w-[260px] items-center gap-2 rounded border border-control
  [background:var(--paper)] px-3 py-2
  focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-copper max-md:hidden`;
const CAMPO = "w-full [background:none] text-[13px] [border:none]";
const PANEL = `absolute top-[calc(100%+8px)] left-0 z-(--z-dropdown-menu) max-h-[360px] w-[320px] max-w-[88vw]
  overflow-y-auto overscroll-contain rounded border border-border [background:var(--card)] p-2 [box-shadow:var(--shadow-md)]`;
const VACIO = "m-0 px-2 py-2.5 text-[13px] text-muted";
// [&+&]: un grupo que sigue a otro grupo lleva la línea de separación.
const GRUPO = "flex flex-col [&+&]:mt-1.5 [&+&]:border-t [&+&]:border-t-border [&+&]:pt-1.5";
const GRUPO_TITULO = "px-2 py-1 text-xs font-bold tracking-[0.04em] text-muted-2 uppercase";
// La opción elegida con las flechas lleva el mismo fondo que hover y foco.
const opcion = (activa) =>
  `block w-full rounded-[6px] p-2 text-left text-[13px] text-text [border:none]
  ${activa ? "[background:var(--paper)]" : "[background:none]"}
  hover:[background:var(--paper)] focus-visible:[background:var(--paper)]`;

// Antes esta barra era puramente decorativa (un <input> sin value ni
// onChange, sin ningún resultado detrás) — parecía funcional pero no
// hacía nada. Ahora busca de verdad en los 3 módulos que anuncia el
// placeholder (equipo, camión, contrato) y navega al módulo
// correspondiente con la búsqueda ya aplicada.
export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState(null); // null = cerrado
  const [buscando, setBuscando] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1); // navegación con flechas
  const queryDebounced = useDebounce(query, 300);
  const navigate = useNavigate();
  const contenedorRef = useRef(null);

  useEffect(() => {
    if (queryDebounced.trim().length < 2) {
      setResultados(null);
      return;
    }
    // AbortController real (no solo una bandera "cancelado" en closure)
    // — mismo patrón que useAsyncList: si el usuario sigue tipeando antes
    // de que responda la búsqueda anterior, esa petición HTTP se corta
    // de verdad en vez de solo ignorar su resultado al llegar tarde.
    const controller = new AbortController();
    setBuscando(true);
    Promise.all([
      equiposService.listarEquipos({ q: queryDebounced, signal: controller.signal }),
      vehiculosService.listarVehiculos({ q: queryDebounced, signal: controller.signal }),
      contratosService.listarContratos({ q: queryDebounced, signal: controller.signal }),
    ])
      .then(([equipos, vehiculos, contratos]) => {
        setResultados({
          equipos: equipos.slice(0, 4),
          vehiculos: vehiculos.slice(0, 4),
          contratos: contratos.slice(0, 4),
        });
        setIndiceActivo(-1);
        setBuscando(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return; // cancelación intencional
        setBuscando(false);
      });
    return () => controller.abort();
  }, [queryDebounced]);

  // Cierra el desplegable al hacer clic afuera.
  useEffect(() => {
    function onClickFuera(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setResultados(null);
      }
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  function irA(ruta, texto) {
    setQuery("");
    setResultados(null);
    navigate(`${ruta}?q=${encodeURIComponent(texto)}`);
  }

  // Lista plana de resultados (con id único de DOM y destino de
  // navegación) para poder recorrerla con las flechas del teclado sin
  // importar a qué grupo (Equipos/Vehículos/Contratos) pertenece cada uno.
  const opciones = useMemo(() => {
    if (!resultados) return [];
    return [
      ...resultados.equipos.map((eq) => ({ id: `gs-eq-${eq.id}`, ruta: "/operaciones", texto: eq.identificador })),
      ...resultados.vehiculos.map((v) => ({ id: `gs-veh-${v.id}`, ruta: "/operaciones", texto: v.placa })),
      ...resultados.contratos.map((c) => ({ id: `gs-con-${c.id}`, ruta: "/rrhh", texto: c.trabajador })),
    ];
  }, [resultados]);

  function onKeyDown(e) {
    if (e.key === "Escape") {
      setResultados(null);
      return;
    }
    if (!opciones.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceActivo((i) => (i + 1) % opciones.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceActivo((i) => (i <= 0 ? opciones.length - 1 : i - 1));
    } else if (e.key === "Enter" && indiceActivo >= 0) {
      e.preventDefault();
      const activa = opciones[indiceActivo];
      irA(activa.ruta, activa.texto);
    }
  }

  const hayResultados =
    resultados && (resultados.equipos.length || resultados.vehiculos.length || resultados.contratos.length);

  return (
    <div className={CAJA} ref={contenedorRef}>
      <IconSearch width={14} height={14} aria-hidden="true" />
      <input
        className={CAMPO}
        aria-label="Buscar contrato, equipo o camión"
        placeholder="Buscar contrato, equipo, camión..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={!!resultados}
        aria-controls="global-search-resultados"
        aria-autocomplete="list"
        aria-activedescendant={indiceActivo >= 0 ? opciones[indiceActivo]?.id : undefined}
      />

      {resultados && (
        <div className={PANEL} id="global-search-resultados" role="listbox">
          {buscando && <p className={VACIO}>Buscando...</p>}
          {!buscando && !hayResultados && <p className={VACIO}>Sin resultados para "{query}"</p>}

          {resultados.equipos.length > 0 && (
            <div className={GRUPO}>
              <span className={GRUPO_TITULO}>Equipos</span>
              {resultados.equipos.map((eq) => {
                const id = `gs-eq-${eq.id}`;
                return (
                  <button
                    key={id}
                    id={id}
                    type="button"
                    role="option"
                    aria-selected={opciones[indiceActivo]?.id === id}
                    className={opcion(opciones[indiceActivo]?.id === id)}
                    onClick={() => irA("/operaciones", eq.identificador)}
                  >
                    <b>{eq.identificador}</b> — {eq.categoria}
                  </button>
                );
              })}
            </div>
          )}

          {resultados.vehiculos.length > 0 && (
            <div className={GRUPO}>
              <span className={GRUPO_TITULO}>Vehículos</span>
              {resultados.vehiculos.map((v) => {
                const id = `gs-veh-${v.id}`;
                return (
                  <button
                    key={id}
                    id={id}
                    type="button"
                    role="option"
                    aria-selected={opciones[indiceActivo]?.id === id}
                    className={opcion(opciones[indiceActivo]?.id === id)}
                    onClick={() => irA("/operaciones", v.placa)}
                  >
                    <b>{v.placa}</b> — {v.tipoUnidad}
                  </button>
                );
              })}
            </div>
          )}

          {resultados.contratos.length > 0 && (
            <div className={GRUPO}>
              <span className={GRUPO_TITULO}>Contratos</span>
              {resultados.contratos.map((c) => {
                const id = `gs-con-${c.id}`;
                return (
                  <button
                    key={id}
                    id={id}
                    type="button"
                    role="option"
                    aria-selected={opciones[indiceActivo]?.id === id}
                    className={opcion(opciones[indiceActivo]?.id === id)}
                    onClick={() => irA("/rrhh", c.trabajador)}
                  >
                    <b>{c.trabajador}</b> — {c.tipo}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
