import { useLayoutEffect, useRef } from "react";
import { IconLoader } from "../icons/Icons";
import "./Carga.css";

// Con movimiento reducido no gira: el texto en gerundio ya avisa que la
// operación está en curso, y el ícono queda quieto. El @keyframes está en
// Carga.css.
const GIRO = "shrink-0 animate-[spinner-girar_0.8s_linear_infinite] motion-reduce:animate-none";

/** Spinner único de la app (botones, diálogos, bloques de carga). */
export function Spinner({ tamano = 15, className = "" }) {
  return <IconLoader className={`${GIRO} ${className}`} width={tamano} height={tamano} aria-hidden="true" />;
}

/**
 * Botón que escribe en el backend. Mientras `cargando`:
 *   - se deshabilita (evita el doble envío y los registros duplicados),
 *   - muestra el spinner y el texto en gerundio ("Guardando…"),
 *   - anuncia aria-busy para lectores de pantalla.
 * Conserva su ancho para que la barra de acciones no salte al cambiar
 * el texto.
 */
export function BotonCarga({
  cargando = false,
  textoCargando = "Guardando…",
  className = "btn-primary",
  type = "button",
  disabled,
  children,
  style,
  ...resto
}) {
  // Se mide el botón en reposo y se usa ese ancho como mínimo mientras
  // carga: "Guardar" → "Guardando…" no hace saltar la barra de acciones.
  const ref = useRef(null);
  const anchoReposoRef = useRef(0);
  useLayoutEffect(() => {
    const boton = ref.current;
    if (!boton) return;
    if (cargando) {
      boton.style.minWidth = `${anchoReposoRef.current}px`;
    } else {
      boton.style.minWidth = "";
      anchoReposoRef.current = boton.offsetWidth;
    }
  }, [cargando, children]);

  return (
    <button
      ref={ref}
      style={style}
      type={type}
      className={`${className} boton-carga justify-center`}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...resto}
    >
      {cargando ? (
        <>
          <Spinner />
          <span className="[font-variant-numeric:tabular-nums]">{textoCargando}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
