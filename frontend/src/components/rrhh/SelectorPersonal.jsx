import { useId, useState } from "react";

const normalizar = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MAX_OPCIONES = 8;

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
      <div className="selector-personal__elegido">
        <span>
          <b>{elegido.nombre}</b> <span className="selector-personal__dni">{elegido.dni}</span>
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
    <div className="selector-personal">
      <input
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
      <ul className="selector-personal__lista" id={listaId} role="listbox" aria-label="Personal">
        {coincidencias.slice(0, MAX_OPCIONES).map((t) => (
          <li key={t.dni} role="option" aria-selected="false">
            <button type="button" onClick={() => onChange(t.dni)}>
              <span>{t.nombre}</span>
              <span className="selector-personal__dni">{t.dni}</span>
            </button>
          </li>
        ))}
      </ul>
      {coincidencias.length > MAX_OPCIONES && (
        <p className="campo-ayuda">Mostrando {MAX_OPCIONES} de {coincidencias.length}: escribe más para acotar.</p>
      )}
      {coincidencias.length === 0 && <p className="campo-ayuda">No hay personal con contrato que coincida con «{texto}».</p>}
    </div>
  );
}
