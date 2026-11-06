import { Spinner } from "./Carga";
import "./Loading.css";

// `compacto`: menos relleno, para un bloque chico (la carga del gráfico del
// Dashboard). Los relleno van en dos constantes para no poner dos p- en el
// mismo elemento. El @keyframes del pulso está en Loading.css.
const BLOQUE = "box-border flex w-full flex-col items-center justify-center gap-4";
const RELLENO = "px-5 py-20";
const RELLENO_COMPACTO = "px-4 py-6";
const TEXTO = `m-0 text-[13.5px] font-medium tracking-[0.01em] text-muted animate-[loading-pulso_1.5s_ease-in-out_infinite]
  motion-reduce:animate-none motion-reduce:opacity-100`;

/**
 * Bloque de carga para listas y pantallas (al entrar a una sección, al
 * cambiar de pestaña, empresa o filtro). role="status": el lector de
 * pantalla anuncia "Cargando información…" sin interrumpir.
 */
export default function Loading({ texto = "Cargando información…", compacto = false }) {
  return (
    <div className={`${BLOQUE} ${compacto ? RELLENO_COMPACTO : RELLENO}`} role="status" aria-live="polite">
      <Spinner tamano={30} className="text-copper" />
      <p className={TEXTO}>{texto}</p>
    </div>
  );
}
