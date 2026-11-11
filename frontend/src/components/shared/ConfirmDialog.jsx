import { useEffect, useId, useRef, useState } from "react";
import { useBloquearScroll } from "../../hooks/useBloquearScroll";
import { IconAlertCircle, IconHelpCircle } from "../icons/Icons";
import { Spinner } from "./Carga";

// Clases que quedan como gancho de otras reglas (no dan estilo por sí solas):
// confirm-overlay (ToastContainer.css: con un diálogo abierto, los avisos no
// estorban), btn-confirm-* (responsive.css: 44px táctiles) y confirm-palabra
// (styles/foco.css: anillo de foco rojo del campo, ver allí).
// Solo -webkit-backdrop-filter, como quedaba antes en el build: lightningcss
// juntaba "backdrop-filter" y "-webkit-backdrop-filter" y dejaba solo la
// versión con prefijo, así que el desenfoque solo se ve en Safari. Se copia
// tal cual para no cambiar el aspecto en este paso (ver docs/tailwind.md).
const FONDO = `confirm-overlay fixed inset-0 z-(--z-confirm) flex items-center justify-center p-6
  [background:color-mix(in_srgb,var(--ink-2)_55%,transparent)] [-webkit-backdrop-filter:blur(4px)]
  max-md:p-4`;
const TARJETA = `m-0 max-h-full w-full max-w-[400px] overflow-y-auto overscroll-contain rounded-lg border p-[26px]
  [background:var(--card)] [box-shadow:var(--shadow-lg)] focus:[outline:none] max-md:p-5`;
const ICONO = "box-border h-[46px] w-[46px] rounded-[10px] p-2.5";
const ICONO_PELIGRO = `${ICONO} [background:var(--danger-tint)] text-danger-dark`;
const ICONO_NORMAL = `${ICONO} [background:var(--electro-tint)] text-electro-dark`;
const TITULO = "mx-0 mt-0 mb-2 text-xl leading-[1.3] font-semibold text-text [overflow-wrap:anywhere]";
// Sin título (llamadas viejas con un solo texto), el mensaje es lo principal
// y conserva el color fuerte.
const MENSAJE = "mx-0 mt-0 mb-6 text-[14.5px] leading-[1.5] [overflow-wrap:anywhere]";
const PALABRA_CAMPO = "h-(--control-height-lg) w-full rounded border border-control [background:var(--card)] px-3 py-0 font-body text-md text-text";
const ERROR = "mx-0 -mt-3 mb-5 rounded [background:var(--danger-tint)] px-4 py-3 text-base leading-[1.45] text-danger-dark";
const ACCIONES = "flex justify-end gap-3 max-md:flex-wrap max-md:[&>button]:[flex:1_1_auto]";
const BOTON = `inline-flex min-h-(--control-height-md) cursor-pointer items-center justify-center gap-2 rounded px-4 py-[9px] text-[13.5px]
  [transition:background_0.15s_ease]`;
// Deshabilitado por el usuario: atenuado. Ocupado (ejecutando la acción): el
// botón principal muestra el spinner con su opacidad normal.
const DESHABILITADO = "disabled:cursor-not-allowed disabled:opacity-55";
const OCUPADO = "disabled:cursor-progress disabled:opacity-100";
const BOTON_SECUNDARIO = `btn-confirm-secondary ${BOTON} ${DESHABILITADO} border border-border [background:var(--paper)] font-medium text-text
  hover:[background:var(--gray-tint)]`;
const BOTON_PRINCIPAL = `btn-confirm-primary ${BOTON} [border:none] [background:var(--electro)] font-semibold text-on-accent
  hover:[background:var(--electro-dark)]`;
const BOTON_PELIGRO = `btn-confirm-danger ${BOTON} [border:none] [background:var(--danger)] font-semibold text-on-accent
  hover:[background:var(--danger-dark)]`;

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
  const claseBoton = `${esPeligro && !soloInformativo ? BOTON_PELIGRO : BOTON_PRINCIPAL} ${cargando ? OCUPADO : DESHABILITADO}`;

  return (
    <div className={FONDO} onClick={cancelar}>
      <form
        ref={cardRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloVisible ? tituloId : undefined}
        aria-describedby={mensajeId}
        aria-busy={cargando}
        className={`${TARJETA} ${tipo === "peligro" ? "border-danger-tint" : "border-border"}`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onConfirmar}
        noValidate
      >
        <div className="mb-4 inline-flex">
          {tipo === "peligro" ? (
            <IconAlertCircle className={ICONO_PELIGRO} width={26} height={26} />
          ) : (
            <IconHelpCircle className={ICONO_NORMAL} width={26} height={26} />
          )}
        </div>

        {tituloVisible && (
          <h2 id={tituloId} className={`${TITULO} font-display`}>
            {tituloVisible}
          </h2>
        )}
        <p id={mensajeId} className={`${MENSAJE} ${tituloVisible ? "text-muted" : "text-text"}`}>
          {mensajeVisible}
        </p>

        {palabraConfirmacion && !alternativaActiva && (
          <div className="confirm-palabra mx-0 -mt-2 mb-5">
            <label className="mb-2 block text-base text-text" htmlFor={inputId}>
              Para confirmar, escribe <b className="[font-family:var(--font-mono)] font-semibold [overflow-wrap:anywhere]">{palabraConfirmacion}</b>
            </label>
            <input
              className={PALABRA_CAMPO}
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
          <p className={ERROR} role="alert">
            {error}
          </p>
        )}

        <div className={ACCIONES}>
          {!soloInformativo && (
            <button ref={cancelarRef} className={BOTON_SECUNDARIO} type="button" onClick={cancelar} disabled={cargando}>
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
