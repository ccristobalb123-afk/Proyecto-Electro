import { useId, useState } from "react";

const normalizar = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MAX_OPCIONES = 8;

/**
 * Elegir un camión o una persona escribiendo para filtrar (sin
 * distinguir tildes). `opciones`: [{ id, titulo, detalle, busqueda }],
 * donde `busqueda` es el texto extra por el que también se encuentra
 * (DNI, empresa…). Ya elegido, queda fijo con "Cambiar".
 */
export default function SelectorDestinatario({ opciones, value, onChange, etiqueta, placeholder, sinCoincidencias }) {
  const [texto, setTexto] = useState("");
  const listaId = useId();
  const elegido = opciones.find((o) => String(o.id) === String(value));

  if (elegido) {
    return (
      <div className="selector-destino__elegido">
        <span className="selector-destino__texto">
          <b>{elegido.titulo}</b>
          <span className="selector-destino__detalle">{elegido.detalle}</span>
        </span>
        <button type="button" className="btn-outline-sm" onClick={() => onChange("")}>
          Cambiar
        </button>
      </div>
    );
  }

  const q = normalizar(texto.trim());
  const coincidencias = opciones.filter((o) => !q || normalizar(`${o.titulo} ${o.busqueda || ""}`).includes(q));

  return (
    <div className="selector-destino">
      <input
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
        <ul className="selector-destino__lista" id={listaId} role="listbox" aria-label={etiqueta}>
          {coincidencias.slice(0, MAX_OPCIONES).map((o) => (
            <li key={o.id} role="option" aria-selected="false">
              <button type="button" onClick={() => onChange(String(o.id))}>
                <span className="selector-destino__titulo">{o.titulo}</span>
                <span className="selector-destino__detalle">{o.detalle}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {coincidencias.length > MAX_OPCIONES && (
        <p className="campo-ayuda">Mostrando {MAX_OPCIONES} de {coincidencias.length}: escribe más para acotar.</p>
      )}
      {coincidencias.length === 0 && <p className="campo-ayuda">{sinCoincidencias} «{texto}».</p>}
    </div>
  );
}
