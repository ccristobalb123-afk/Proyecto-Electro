import { createContext, useCallback, useContext, useRef, useState } from "react";
import ConfirmDialog from "../components/shared/ConfirmDialog";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialogo, setDialogo] = useState(null); // { mensaje, tipo } | null
  const resolverRef = useRef(null);

  /**
   * Dispara un diálogo de confirmación asíncrono.
   * Retorna una Promesa que se resuelve a `true` (Confirmar) o `false` (Cancelar).
   *
   * @param {string} mensaje - Texto principal del modal.
   * @param {Object} [opciones]
   * @param {'normal'|'peligro'} [opciones.tipo='normal']
   * @returns {Promise<boolean>}
   */
  const confirmar = useCallback((mensaje, { tipo = "normal" } = {}) => {
    return new Promise((resolve) => {
      if (resolverRef.current) {
        resolverRef.current(false);
      }
      resolverRef.current = resolve;
      setDialogo({ mensaje, tipo });
    });
  }, []);

  const responder = useCallback((valor) => {
    if (resolverRef.current) {
      resolverRef.current(valor);
      resolverRef.current = null;
    }
    setDialogo(null);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirmar }}>
      {children}
      {dialogo && (
        <ConfirmDialog
          mensaje={dialogo.mensaje}
          tipo={dialogo.tipo}
          onConfirmar={() => responder(true)}
          onCancelar={() => responder(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * Hook para invocar flujos de confirmación asíncronos.
 * @example const seguro = await confirmar("¿Eliminar este registro?", { tipo: "peligro" });
 */
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm debe usarse dentro de un <ConfirmProvider>");
  }
  return context;
}
