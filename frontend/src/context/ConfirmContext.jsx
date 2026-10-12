import { createContext, useCallback, useContext, useRef, useState } from "react";
import ConfirmDialog from "../components/shared/ConfirmDialog";

const ConfirmContext = createContext(null);

// Acepta tanto el formato viejo confirmar("¿Seguro?", { tipo }) como
// el nuevo confirmar({ titulo, mensaje, ... }).
function normalizar(mensajeUOpciones, opciones) {
  return typeof mensajeUOpciones === "string" ? { ...opciones, mensaje: mensajeUOpciones } : { ...mensajeUOpciones };
}

export function ConfirmProvider({ children }) {
  const [dialogo, setDialogo] = useState(null);
  const resolverRef = useRef(null);

  const abrir = useCallback((config) => {
    return new Promise((resolve) => {
      // Si había otro diálogo abierto, se da por cancelado.
      if (resolverRef.current) resolverRef.current(false);
      resolverRef.current = resolve;
      setDialogo(config);
    });
  }, []);

  /**
   * Diálogo de confirmación. Devuelve una promesa que se resuelve a:
   *   - true          → confirmó (y, si hay `accion`, la acción terminó bien)
   *   - "alternativa" → eligió la acción alternativa (ej. "Desactivar en su lugar")
   *   - false         → canceló
   *
   * @param {string|Object} mensajeUOpciones - Texto, u objeto con las opciones:
   * @param {string} [opciones.titulo] - Ej. "¿Eliminar a Juan Pérez?"
   * @param {string} opciones.mensaje - Qué se pierde y si se puede deshacer.
   * @param {'normal'|'peligro'} [opciones.tipo='normal']
   * @param {string} [opciones.textoConfirmar='Confirmar'] - Ej. "Eliminar usuario".
   * @param {string} [opciones.textoCargando] - Ej. "Eliminando…".
   * @param {string} [opciones.palabraConfirmacion] - Texto a escribir para habilitar el botón.
   * @param {() => Promise<any>} [opciones.accion] - Se ejecuta DENTRO del diálogo:
   *   botón con estado de carga, y el diálogo solo se cierra si sale bien.
   *   Si falla, el error se muestra en el mismo diálogo.
   * @param {(err) => ({ texto: string, textoCargando?: string, accion: () => Promise<any> } | null)} [opciones.alternativa]
   *   Para un error de negocio (409), ofrece otra acción en vez de solo mostrar el error.
   * @returns {Promise<boolean|"alternativa">}
   */
  const confirmar = useCallback(
    (mensajeUOpciones, opciones) => abrir({ tipo: "normal", ...normalizar(mensajeUOpciones, opciones), soloInformativo: false }),
    [abrir]
  );

  /**
   * Aviso con un solo botón "Entendido" — para explicar por qué algo no
   * se puede hacer (ej. "no se puede eliminar porque ya tiene pagos").
   * Un modal obliga a leerlo; un toast se puede pasar por alto.
   * @param {string|Object} mensajeUOpciones - Texto, u objeto { titulo, mensaje, tipo }.
   * @returns {Promise<void>}
   */
  const alertar = useCallback(
    (mensajeUOpciones, opciones) =>
      abrir({ tipo: "peligro", ...normalizar(mensajeUOpciones, opciones), soloInformativo: true }).then(() => undefined),
    [abrir]
  );

  const responder = useCallback((valor) => {
    resolverRef.current?.(valor);
    resolverRef.current = null;
    setDialogo(null);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirmar, alertar }}>
      {children}
      {dialogo && <ConfirmDialog {...dialogo} onResolver={responder} />}
    </ConfirmContext.Provider>
  );
}

/**
 * @example const ok = await confirmar({
 *   titulo: "¿Eliminar a Juan Pérez?",
 *   mensaje: "Se eliminará de forma permanente. Esta acción no se puede deshacer.",
 *   tipo: "peligro",
 *   textoConfirmar: "Eliminar usuario",
 *   accion: () => usuariosService.eliminarUsuario(id),
 * });
 * @example await alertar({ titulo: "No se puede eliminar", mensaje: "Ya tiene pagos registrados." });
 */
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm debe usarse dentro de un <ConfirmProvider>");
  }
  return context;
}
