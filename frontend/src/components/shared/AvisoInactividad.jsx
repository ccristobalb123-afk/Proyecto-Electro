import { useEffect, useId, useRef, useState } from "react";
import { IconHourglass } from "../icons/Icons";
import { useBloquearScroll } from "../../hooks/useBloquearScroll";
import "./AvisoInactividad.css";

// Momentos en que el lector de pantalla anuncia cuánto falta (anunciarlo
// cada segundo sería ruido constante).
const ANUNCIOS = new Set([120, 60, 30, 10]);

/**
 * Diálogo de "tu sesión está por cerrarse". Accesible: role="alertdialog"
 * (el lector de pantalla lo anuncia apenas aparece), el foco va al botón
 * y no puede salir del diálogo, Escape equivale a "Seguir conectado", y al
 * cerrarse el foco vuelve a donde estaba.
 */
export default function AvisoInactividad({ segundosRestantes, onSeguirConectado }) {
  const tituloId = useId();
  const descripcionId = useId();
  const botonRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  useBloquearScroll();

  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;
  const tiempo = `${minutos}:${String(segundos).padStart(2, "0")}`;

  useEffect(() => {
    const anterior = document.activeElement;
    botonRef.current?.focus();
    return () => {
      if (anterior instanceof HTMLElement && document.contains(anterior)) anterior.focus();
    };
  }, []);

  // Solo en esos segundos tiene texto: la región "polite" lo lee cuando aparece.
  const anuncio = !ANUNCIOS.has(segundosRestantes)
    ? ""
    : segundosRestantes >= 60
      ? `Quedan ${segundosRestantes / 60} ${segundosRestantes === 60 ? "minuto" : "minutos"}.`
      : `Quedan ${segundosRestantes} segundos.`;

  async function seguir() {
    if (enviando) return;
    setEnviando(true);
    try {
      await onSeguirConectado();
    } finally {
      setEnviando(false);
    }
  }

  function alPresionarTecla(e) {
    if (e.key === "Tab") {
      // Un solo elemento con foco: Tab no debe ir a la página de atrás.
      e.preventDefault();
      botonRef.current?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      seguir();
    }
  }

  return (
    <div className="aviso-inactividad-overlay">
      <div
        className="aviso-inactividad-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descripcionId}
        onKeyDown={alPresionarTecla}
      >
        <div className="aviso-inactividad-icono-container" aria-hidden="true">
          <IconHourglass className="aviso-inactividad-icono" width={30} height={30} />
        </div>
        <h2 id={tituloId} className="font-display">
          Tu sesión está por cerrarse por inactividad
        </h2>
        <p id={descripcionId}>
          Se cerrará en{" "}
          <strong className="timer-destacado" role="timer" aria-live="off">
            {tiempo}
          </strong>{" "}
          para proteger la información si dejaste el equipo sin vigilancia.
        </p>
        <p className="sr-only" aria-live="polite">
          {anuncio}
        </p>
        <button ref={botonRef} type="button" className="btn-seguir-conectado" onClick={seguir} disabled={enviando}>
          {enviando ? "Conectando…" : "Seguir conectado"}
        </button>
      </div>
    </div>
  );
}
