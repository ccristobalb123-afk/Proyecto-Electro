import { useEffect } from "react";

// Diálogos abiertos ahora mismo (uno puede abrirse encima de otro, ej. el
// visor de archivos dentro de "Documentos"): el scroll vuelve recién al
// cerrar el último.
let abiertos = 0;
let estiloOriginal = null;

/**
 * Bloquea el scroll del fondo mientras un diálogo está abierto. En esta
 * app el que se desplaza no es el <body> sino `.main` (ver AppShell.css),
 * así que bloquear solo el body no alcanzaba: en el celular, al llegar al
 * final de un modal o arrastrar sobre el fondo oscuro, la página de atrás
 * seguía moviéndose. La posición del scroll se conserva.
 */
export function useBloquearScroll(activo = true) {
  useEffect(() => {
    if (!activo) return undefined;
    if (abiertos === 0) {
      const main = document.querySelector(".main");
      estiloOriginal = { body: document.body.style.overflow, main, mainOverflow: main?.style.overflow ?? "" };
      document.body.style.overflow = "hidden";
      if (main) main.style.overflow = "hidden";
    }
    abiertos += 1;
    return () => {
      abiertos -= 1;
      if (abiertos === 0 && estiloOriginal) {
        document.body.style.overflow = estiloOriginal.body;
        if (estiloOriginal.main) estiloOriginal.main.style.overflow = estiloOriginal.mainOverflow;
        estiloOriginal = null;
      }
    };
  }, [activo]);
}
