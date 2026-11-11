import { useId, useState } from "react";
import { AYUDA } from "../shared/clasesModal";

const normalizar = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MAX_OPCIONES = 8;

// "selector-destino__lista" queda como gancho: responsive.css (44px táctiles
// y tamaño de letra de los campos).
const LISTA = "selector-destino__lista mx-0 mt-1.5 mb-0 max-h-[290px] list-none overflow-y-auto overscroll-contain rounded border border-border p-0";
// Cada opción: borde inferior salvo en la última ([&&]: para que le gane a
// [border:0] sin depender del orden). Bloqueada (ya tiene un equipo de este
// tipo): gris, sin hover, con el motivo en rojo oscuro debajo.
const OPCION = `flex min-h-11 w-full cursor-pointer flex-col items-start gap-0.5 [border:0] [&&]:[border-bottom:1px_solid_var(--border)]
  [li:last-child>&]:[border-bottom:0] [background:var(--card)] px-3 py-2 text-left [font:inherit] [color:inherit] hover:[background:var(--accion-tint)]
  disabled:cursor-not-allowed disabled:[background:var(--gray-tint)] disabled:hover:[background:var(--gray-tint)]`;
const TITULO = "text-[15px] font-semibold wrap-anywhere";
const TITULO_BLOQUEADO = `${TITULO} text-muted`;
const DETALLE = "text-sm text-muted wrap-anywhere";
const BLOQUEO = "text-sm font-semibold text-danger-dark wrap-anywhere";
const ELEGIDO = "flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-paper px-3 py-2";
const ELEGIDO_TEXTO = "flex min-w-0 flex-col gap-0.5";

/**
 * Elegir un camión o una persona escribiendo para filtrar (sin
 * distinguir tildes). `opciones`: [{ id, titulo, detalle, busqueda, bloqueo }],
 * donde `busqueda` es el texto extra por el que también se encuentra
 * (DNI, empresa…) y `bloqueo`, si viene, el motivo por el que no se puede
 * elegir (se muestra, deshabilitada). Ya elegido, queda fijo con "Cambiar".
 */
export default function SelectorDestinatario({ opciones, value, onChange, etiqueta, placeholder, sinCoincidencias }) {
  const [texto, setTexto] = useState("");
  const listaId = useId();
  const elegido = opciones.find((o) => String(o.id) === String(value) && !o.bloqueo);

  if (elegido) {
    return (
      <div className={ELEGIDO}>
        <span className={ELEGIDO_TEXTO}>
          <b>{elegido.titulo}</b>
          <span className={DETALLE}>{elegido.detalle}</span>
        </span>
        <button type="button" className="btn-outline-sm min-h-11" onClick={() => onChange("")}>
          Cambiar
        </button>
      </div>
    );
  }

  const q = normalizar(texto.trim());
  const coincidencias = opciones.filter((o) => !q || normalizar(`${o.titulo} ${o.busqueda || ""}`).includes(q));

  return (
    <div>
      <input
        className="w-full"
        type="search"
        role="combobox"
        aria-expanded="true"
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-label={etiqueta}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      {coincidencias.length > 0 && (
        <ul className={LISTA} id={listaId} role="listbox" aria-label={etiqueta}>
          {coincidencias.slice(0, MAX_OPCIONES).map((o) => (
            <li key={o.id} role="option" aria-selected="false" aria-disabled={o.bloqueo ? "true" : undefined}>
              <button
                type="button"
                className={OPCION}
                disabled={!!o.bloqueo}
                onClick={() => onChange(String(o.id))}
              >
                <span className={o.bloqueo ? TITULO_BLOQUEADO : TITULO}>{o.titulo}</span>
                <span className={DETALLE}>{o.detalle}</span>
                {o.bloqueo && <span className={BLOQUEO}>{o.bloqueo}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {coincidencias.length > MAX_OPCIONES && (
        <p className={AYUDA}>Mostrando {MAX_OPCIONES} de {coincidencias.length}: escribe más para acotar.</p>
      )}
      {coincidencias.length === 0 && <p className={AYUDA}>{sinCoincidencias} «{texto}».</p>}
    </div>
  );
}
