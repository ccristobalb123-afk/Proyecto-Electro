import { useId, useState } from "react";
import { AYUDA } from "../shared/clasesModal";

const normalizar = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MAX_OPCIONES = 8;

// "selector-personal__lista" queda como gancho: responsive.css (44px
// táctiles y tamaño de letra de los campos).
const LISTA = "selector-personal__lista mx-0 mt-1.5 mb-0 max-h-[264px] list-none overflow-y-auto overscroll-contain rounded border border-border p-0";
// Cada persona: borde inferior salvo en la última. [&&]: para que el borde
// inferior le gane a [border:0] sin depender del orden de las clases.
const OPCION = `flex min-h-11 w-full cursor-pointer items-center justify-between gap-2.5 [border:0] [&&]:[border-bottom:1px_solid_var(--border)]
  [li:last-child>&]:[border-bottom:0] [background:var(--card)] px-3 py-2 text-left [font:inherit] text-text hover:[background:var(--accion-tint)]`;
const DNI = "flex-none [font-family:var(--font-mono)] text-xs text-muted";
const ELEGIDO = "flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-paper px-3 py-2";

/**
 * Elegir a una persona escribiendo su nombre o DNI ("Nuevo registro" de
 * Cursos / EMO). Cada persona aparece una sola vez, aunque tenga
 * contrato en las dos empresas. Ya elegida, queda fija con "Cambiar".
 */
export default function SelectorPersonal({ trabajadores, value, onChange }) {
  const [texto, setTexto] = useState("");
  const listaId = useId();
  const elegido = trabajadores.find((t) => t.dni === value);

  if (elegido) {
    return (
      <div className={ELEGIDO}>
        <span>
          <b>{elegido.nombre}</b> <span className={DNI}>{elegido.dni}</span>
        </span>
        <button type="button" className="btn-outline-sm" onClick={() => onChange("")}>
          Cambiar
        </button>
      </div>
    );
  }

  const q = normalizar(texto.trim());
  const unicos = [...new Map(trabajadores.map((t) => [t.dni, t])).values()];
  const coincidencias = unicos.filter((t) => !q || normalizar(t.nombre).includes(q) || t.dni.includes(q));

  return (
    <div>
      <input
        className="w-full"
        type="search"
        role="combobox"
        aria-expanded="true"
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-label="Buscar personal por nombre o DNI"
        placeholder="Escribe el nombre o DNI…"
        autoComplete="off"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <ul className={LISTA} id={listaId} role="listbox" aria-label="Personal">
        {coincidencias.slice(0, MAX_OPCIONES).map((t) => (
          <li key={t.dni} role="option" aria-selected="false">
            <button type="button" className={OPCION} onClick={() => onChange(t.dni)}>
              <span>{t.nombre}</span>
              <span className={DNI}>{t.dni}</span>
            </button>
          </li>
        ))}
      </ul>
      {coincidencias.length > MAX_OPCIONES && (
        <p className={AYUDA}>Mostrando {MAX_OPCIONES} de {coincidencias.length}: escribe más para acotar.</p>
      )}
      {coincidencias.length === 0 && <p className={AYUDA}>No hay personal con contrato que coincida con «{texto}».</p>}
    </div>
  );
}
