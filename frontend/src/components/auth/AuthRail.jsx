/**
 * Riel de pasos del acceso: el circuito de la marca convertido en el recorrido
 * de la autenticación. Cada nodo es un paso; los que ya se pasaron y el actual
 * quedan encendidos, y el trazo entre nodos se extiende hacia el siguiente.
 *
 * `pasos`: [{ id, etiqueta }]   `actual`: índice del paso en curso.
 *
 * Es una lista ordenada con aria-current="step" y cada estado también va en
 * texto: el color nunca es la única señal.
 *
 * Estilos con Tailwind. Vertical en escritorio; desde 959px hacia abajo
 * (max-[960px]:) pasa a horizontal, igual que el resto de AuthShell.
 */

// Trazo entre nodos (no en el último): una pista tenue (before:) y, encima,
// el relleno ámbar (after:) que se extiende hacia el siguiente nodo cuando
// este ya se pasó. Vertical: left-[5px] = centro del punto (6px) menos la
// mitad del trazo (1px). Horizontal: tramo de 24px al final de cada nodo.
const TRAZO = `not-last:before:absolute not-last:before:top-5 not-last:before:bottom-0 not-last:before:left-[5px] not-last:before:w-0.5 not-last:before:bg-ink-border
  not-last:after:absolute not-last:after:top-5 not-last:after:bottom-0 not-last:after:left-[5px] not-last:after:w-0.5 not-last:after:bg-volt
  not-last:after:origin-top not-last:after:[transition:transform_300ms_var(--ease-out)] motion-reduce:not-last:after:[transition:none]
  max-[960px]:not-last:before:top-[9px] max-[960px]:not-last:before:right-2 max-[960px]:not-last:before:bottom-auto max-[960px]:not-last:before:left-auto max-[960px]:not-last:before:h-0.5 max-[960px]:not-last:before:w-6
  max-[960px]:not-last:after:top-[9px] max-[960px]:not-last:after:right-2 max-[960px]:not-last:after:bottom-auto max-[960px]:not-last:after:left-auto max-[960px]:not-last:after:h-0.5 max-[960px]:not-last:after:w-6
  max-[960px]:not-last:after:origin-left`;

// El relleno del trazo: lleno si el paso ya se pasó, vacío si no.
// [transform:…] y no scale-y-0: la clase de Tailwind usa la propiedad
// "scale" y el estilo calculado dejaría de ser igual al de antes.
const TRAZO_LLENO = "not-last:after:[transform:scaleY(1)] max-[960px]:not-last:after:[transform:scaleX(1)]";
const TRAZO_VACIO = "not-last:after:[transform:scaleY(0)] max-[960px]:not-last:after:[transform:scaleX(0)]";

const PUNTO = `mt-1 box-border size-3 flex-none rounded-[50%] border-2
  [transition:background-color_180ms_var(--ease-out),border-color_180ms_var(--ease-out),outline-color_180ms_var(--ease-out)]`;

const PUNTO_POR_ESTADO = {
  hecho: "border-volt bg-volt",
  actual: "border-volt bg-volt outline-2 outline-offset-3 outline-[color-mix(in_srgb,var(--volt)_45%,transparent)]",
  // [background:transparent] y no bg-transparent: como el "background:"
  // de antes, también reinicia la posición del fondo (estilo calculado igual).
  pendiente: "border-on-ink-muted [background:transparent]",
};

const ETIQUETA_POR_ESTADO = {
  hecho: "text-on-ink-soft",
  actual: "text-on-ink font-semibold",
  pendiente: "text-on-ink-muted",
};

export default function AuthRail({ pasos, actual }) {
  return (
    // pl-1: aire para el anillo del nodo actual. Con movimiento reducido,
    // solo fundido (fade-in está en motion.css).
    <ol
      className={`relative m-0 mt-10 flex list-none flex-col p-0 pl-1
        animate-[auth-rail-entrada_500ms_var(--ease-out)_both] motion-reduce:[animation-name:fade-in]
        [@media(min-width:960px)_and_(max-height:620px)]:mt-6
        max-[960px]:m-0 max-[960px]:flex-row max-[960px]:p-0`}
      role="list"
      aria-label="Progreso de acceso"
    >
      {pasos.map((paso, i) => {
        const estado = i < actual ? "hecho" : i === actual ? "actual" : "pendiente";
        return (
          <li
            key={paso.id}
            className={`relative flex items-start gap-3.5 pb-7 last:pb-0 max-[960px]:pr-10 max-[960px]:pb-0 max-[960px]:last:pr-0
              ${TRAZO} ${estado === "hecho" ? TRAZO_LLENO : TRAZO_VACIO}`}
            aria-current={estado === "actual" ? "step" : undefined}
          >
            {/* mt-1: centra el punto con la primera línea de la etiqueta */}
            <span className={`${PUNTO} ${PUNTO_POR_ESTADO[estado]}`} aria-hidden="true" />
            <span
              className={`text-base leading-[20px] [transition:color_180ms_var(--ease-out)] ${ETIQUETA_POR_ESTADO[estado]}`}
            >
              {paso.etiqueta}
              <span className="sr-only">
                {estado === "hecho" ? " (completado)" : estado === "actual" ? " (paso actual)" : " (pendiente)"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
