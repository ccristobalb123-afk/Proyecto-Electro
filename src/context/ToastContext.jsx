import { createContext, useCallback, useContext, useRef, useState, useEffect } from "react";
import ToastContainer from "../components/shared/ToastContainer";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // Almacena las referencias de los timeouts activos para poder limpiarlos al vuelo
  const timeoutsRef = useRef(new Map());

  /**
   * Cierra de forma inmediata una notificación y limpia su temporizador.
   */
  const cerrarToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));

    if (timeoutsRef.current.has(id)) {
      clearTimeout(timeoutsRef.current.get(id));
      timeoutsRef.current.delete(id);
    }
  }, []);

  /**
   * Dispara una notificación efímera (Toast) en la parte inferior de la pantalla.
   *
   * @param {string} mensaje - Texto descriptivo de la alerta.
   * @param {Object} [opciones] - Opciones de control.
   * @param {'success'|'error'|'info'} [opciones.tipo='info'] - Tipo visual del toast.
   * @param {string} [opciones.accionTexto] - Etiqueta para el botón interactivo (ej: "Deshacer").
   * @param {Function} [opciones.onAccion] - Callback que se ejecuta al clickear la acción.
   * @param {number} [opciones.duracionMs=5000] - Tiempo de vida en milisegundos.
   * @returns {string} ID único asignado al Toast.
   */
  const mostrarToast = useCallback(
    (mensaje, { tipo = "info", accionTexto, onAccion, duracionMs = 5000 } = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      setToasts((prev) => [...prev, { id, mensaje, tipo, accionTexto, onAccion }]);

      const timeoutId = setTimeout(() => {
        cerrarToast(id);
      }, duracionMs);

      timeoutsRef.current.set(id, timeoutId);

      return id;
    },
    [cerrarToast]
  );

  // Limpieza preventiva total si el proveedor llega a desmontarse del árbol de React
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      timeouts.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast, cerrarToast }}>
      {children}
      <ToastContainer toasts={toasts} onCerrar={cerrarToast} />
    </ToastContext.Provider>
  );
}

/**
 * Hook para disparar notificaciones toast desde cualquier componente.
 * @example const { mostrarToast } = useToast();
 *          mostrarToast("Cambios guardados con éxito", { tipo: "success" });
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de un <ToastProvider>");
  }
  return context;
}
