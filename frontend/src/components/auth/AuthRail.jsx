/**
 * Riel de pasos del acceso: el circuito de la marca convertido en el recorrido
 * de la autenticación. Cada nodo es un paso; los que ya se pasaron y el actual
 * quedan encendidos, y el trazo entre nodos se extiende hacia el siguiente.
 *
 * `pasos`: [{ id, etiqueta }]   `actual`: índice del paso en curso.
 *
 * Es una lista ordenada con aria-current="step" y cada estado también va en
 * texto: el color nunca es la única señal. Los estilos viven en AuthShell.css.
 */
export default function AuthRail({ pasos, actual }) {
  return (
    <ol className="auth-rail" role="list" aria-label="Progreso de acceso">
      {pasos.map((paso, i) => {
        const estado = i < actual ? "hecho" : i === actual ? "actual" : "pendiente";
        return (
          <li
            key={paso.id}
            className={`auth-rail__nodo auth-rail__nodo--${estado}`}
            aria-current={estado === "actual" ? "step" : undefined}
          >
            <span className="auth-rail__punto" aria-hidden="true" />
            <span className="auth-rail__etiqueta">
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
