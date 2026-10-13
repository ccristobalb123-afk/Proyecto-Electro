import { useEffect, useId, useRef, useState } from "react";
import { useBloquearScroll } from "../../hooks/useBloquearScroll";
import { IconAlertCircle, IconHelpCircle } from "../icons/Icons";
import { Spinner } from "./Carga";
import "./ConfirmDialog.css";

// Compara lo escrito con la palabra pedida sin exigir mayúsculas ni
// espacios exactos ("juan  pérez " vale para "Juan Pérez").
function coincide(escrito, esperado) {
  const limpiar = (t) => t.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
  return limpiar(escrito) === limpiar(esperado);
}

/**
 * Diálogo único para confirmar, avisar y ejecutar acciones destructivas.
 * Lo monta ConfirmContext — no se usa directo desde las pantallas.
 */
export default function ConfirmDialog({
  titulo,
  mensaje,
  tipo = "normal",
  soloInformativo = false,
  textoConfirmar = "Confirmar",
  textoCargando = "Procesando…",
  palabraConfirmacion,
  accion,
  alternativa,
  onResolver,
}) {
  const tituloId = useId();
  const mensajeId = useId();
  const inputId = useId();
  const cardRef = useRef(null);
  const cancelarRef = useRef(null);
  const confirmarRef = useRef(null);

  const [escrito, setEscrito] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  // Si la acción principal fue rechazada por una regla de negocio y hay
  // una alternativa (ej. "Desactivar en su lugar"), el diálogo cambia a
  // ofrecerla en vez de dejar al usuario solo con el error.
  const [alternativaActiva, setAlternativaActiva] = useState(null);
  useBloquearScroll();

  const esPeligro = tipo === "peligro" && !alternativaActiva;
  const bloqueadoPorPalabra = !!palabraConfirmacion && !alternativaActiva && !coincide(escrito, palabraConfirmacion);

  // Refs para que el efecto de teclado no se vuelva a montar en cada render.
  const cargandoRef = useRef(false);
  const onResolverRef = useRef(onResolver);
  useEffect(() => {
    cargandoRef.current = cargando;
    onResolverRef.current = onResolver;
  });

  useEffect(() => {
    const disparador = document.activeElement;
    // Foco inicial en "Cancelar" cuando la acción es destructiva — un
    // Enter apurado nunca debe borrar nada. En un aviso, en "Entendido".
    (tipo === "peligro" && !soloInformativo ? cancelarRef.current : confirmarRef.current)?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        if (!cargandoRef.current) onResolverRef.current(false);
        return;
      }
      if (e.key !== "Tab" || !cardRef.current) return;
      // Foco atrapado dentro del diálogo.
      const focalizables = Array.from(cardRef.current.querySelectorAll("button:not([disabled]), input:not([disabled])"));
      if (focalizables.length === 0) return;
      const primero = focalizables[0];
      const ultimo = focalizables[focalizables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      disparador?.focus?.();
    };
  }, [tipo, soloInformativo]);

  function cancelar() {
    if (!cargando) onResolver(false);
  }

  async function ejecutar(fn, resultado) {
    if (!fn) return onResolver(resultado);
    setCargando(true);
    setError("");
    try {
      await fn();
      onResolver(resultado);
    } catch (err) {
      setCargando(false);
      const alt = !alternativaActiva && err?.status === 409 ? alternativa?.(err) : null;
      if (alt) {
        setAlternativaActiva({ ...alt, mensaje: err.message });
        // El botón de confirmar cambia de acción: se le devuelve el foco.
        requestAnimationFrame(() => confirmarRef.current?.focus());
      } else {
        setError(err?.message || "No se pudo completar la acción. Inténtalo de nuevo.");
      }
    }
  }

  function onConfirmar(e) {
    e.preventDefault();
    if (cargando || bloqueadoPorPalabra) return;
    if (alternativaActiva) return ejecutar(alternativaActiva.accion, "alternativa");
    ejecutar(soloInformativo ? null : accion, soloInformativo ? undefined : true);
  }

  const tituloVisible = alternativaActiva ? alternativaActiva.titulo || "No se puede completar la acción" : titulo;
  const mensajeVisible = alternativaActiva ? alternativaActiva.mensaje : mensaje;
  const textoBoton = alternativaActiva ? alternativaActiva.texto : soloInformativo ? "Entendido" : textoConfirmar;
  const textoBotonCargando = alternativaActiva ? alternativaActiva.textoCargando || "Procesando…" : textoCargando;
  const claseBoton = esPeligro && !soloInformativo ? "btn-confirm-danger" : "btn-confirm-primary";

  return (
    <div className="confirm-overlay" onClick={cancelar}>
      <form
        ref={cardRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloVisible ? tituloId : undefined}
        aria-describedby={mensajeId}
        aria-busy={cargando}
        className={`confirm-card ${tipo === "peligro" ? "confirm-card--peligro" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onConfirmar}
        noValidate
      >
        <div className="confirm-icono-container">
          {tipo === "peligro" ? (
            <IconAlertCircle className="confirm-icono confirm-icono--peligro" width={26} height={26} />
          ) : (
            <IconHelpCircle className="confirm-icono confirm-icono--normal" width={26} height={26} />
          )}
        </div>

        {tituloVisible && (
          <h2 id={tituloId} className="confirm-titulo font-display">
            {tituloVisible}
          </h2>
        )}
        <p id={mensajeId} className="confirm-mensaje">
          {mensajeVisible}
        </p>

        {palabraConfirmacion && !alternativaActiva && (
          <div className="confirm-palabra">
            <label htmlFor={inputId}>
              Para confirmar, escribe <b>{palabraConfirmacion}</b>
            </label>
            <input
              id={inputId}
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={escrito}
              disabled={cargando}
              onChange={(e) => setEscrito(e.target.value)}
            />
          </div>
        )}

        {error && (
          <p className="confirm-error" role="alert">
            {error}
          </p>
        )}

        <div className="confirm-acciones">
          {!soloInformativo && (
            <button ref={cancelarRef} className="btn-confirm-secondary" type="button" onClick={cancelar} disabled={cargando}>
              Cancelar
            </button>
          )}
          <button
            ref={confirmarRef}
            className={claseBoton}
            type="submit"
            disabled={cargando || bloqueadoPorPalabra}
          >
            {cargando && <Spinner />}
            {cargando ? textoBotonCargando : textoBoton}
          </button>
        </div>
      </form>
    </div>
  );
}
