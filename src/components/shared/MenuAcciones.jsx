import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconMoreVertical } from "../icons/Icons";
import "./MenuAcciones.css";

/**
 * Menú de acciones tipo "⋮" (kebab menu).
 * Recibe una lista de acciones: [{ label, onClick, peligro?, exito?, Icono? }]
 */
export default function MenuAcciones({ acciones }) {
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });
  const botonRef = useRef(null);
  const menuRef = useRef(null);

  function calcularPosicion() {
    if (!botonRef.current) return;
    const rect = botonRef.current.getBoundingClientRect();
    const anchoMenu = 180; // debe calzar con min-width del CSS

    const seSaleADerecha = rect.left + anchoMenu > window.innerWidth - 12;

    setPosicion({
      top: rect.bottom + 6,
      left: seSaleADerecha ? rect.right - anchoMenu : rect.left,
    });
  }

  function alternarMenu() {
    if (!abierto) calcularPosicion();
    setAbierto((prev) => !prev);
  }

  useEffect(() => {
    function handleClickFuera(e) {
      const clickEnBoton = botonRef.current?.contains(e.target);
      const clickEnMenu = menuRef.current?.contains(e.target);
      if (!clickEnBoton && !clickEnMenu) setAbierto(false);
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    function cerrar() {
      setAbierto(false);
    }
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [abierto]);

  return (
    <>
      <button
        ref={botonRef}
        className={`menu-acciones__boton ${abierto ? "menu-acciones__boton--activo" : ""}`}
        onClick={alternarMenu}
        aria-label="Más acciones"
      >
        <IconMoreVertical width={18} height={18} />
      </button>

      {abierto &&
        createPortal(
          <div
            ref={menuRef}
            className="menu-acciones__lista--portal"
            style={{ top: posicion.top, left: posicion.left }}
          >
            {acciones.map((accion, i) => {
              const IconoAccion = accion.Icono;
              return (
                <button
                  key={i}
                  className={`menu-acciones__item ${accion.peligro ? "menu-acciones__item--peligro" : ""} ${
                    accion.exito ? "menu-acciones__item--exito" : ""
                  }`}
                  onClick={() => {
                    setAbierto(false);
                    accion.onClick();
                  }}
                >
                  {IconoAccion && <IconoAccion width={15} height={15} className="menu-acciones__item-icon" />}
                  <span>{accion.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
