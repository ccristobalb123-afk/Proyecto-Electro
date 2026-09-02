import { useState, useCallback } from "react";

/**
 * Reemplaza el patrón repetido `useState(false)` (modal simple) o
 * `useState(null)` (modal que abre con un registro seleccionado, ej.
 * `setModalHistorial(equipo)` / `setModalHistorial(null)`).
 *
 * Uso — modal simple:
 *   const modalNuevo = useModal();
 *   <button onClick={modalNuevo.abrir}>Nuevo</button>
 *   <Modal open={modalNuevo.abierto} onClose={modalNuevo.cerrar}>...</Modal>
 *
 * Uso — modal con dato seleccionado:
 *   const modalHistorial = useModal();
 *   <button onClick={() => modalHistorial.abrir(equipo)}>Ver hoja de vida</button>
 *   <Modal open={modalHistorial.abierto} onClose={modalHistorial.cerrar}>
 *     {modalHistorial.dato?.codigo}
 *   </Modal>
 */
export function useModal(datoInicial = null) {
  const [dato, setDato] = useState(datoInicial);
  const [abierto, setAbierto] = useState(false);

  const abrir = useCallback((valor = true) => {
    if (valor === true || valor === false) {
      setAbierto(true);
    } else {
      setDato(valor);
      setAbierto(true);
    }
  }, []);

  const cerrar = useCallback(() => {
    setAbierto(false);
    setDato(null);
  }, []);

  return { abierto, dato, abrir, cerrar, setDato };
}
