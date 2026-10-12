import { useCallback, useRef, useState } from "react";

/**
 * Estado de "operación en curso" para todo lo que escribe en el backend
 * (guardar, registrar, adjuntar, eliminar...). Reemplaza el patrón de
 * llamar al service sin ninguna señal: la página parecía congelada en
 * una conexión lenta, y un segundo clic duplicaba el registro.
 *
 * Cada operación lleva una `clave` ("modal", `adjuntar-${id}`...) para
 * que varias tarjetas puedan subir archivos a la vez sin pisarse.
 *
 * Uso:
 *   const acciones = useAccion();
 *   await acciones.ejecutar("modal", async ({ subida }) => {
 *     const { url } = await subirArchivo(archivo, subida); // "Subiendo archivo… 40%"
 *     await service.guardar(...);
 *   });
 *   <BotonCarga cargando={acciones.ocupado("modal")} textoCargando={acciones.texto("modal", "Guardando…")} />
 */
export function useAccion() {
  const [estados, setEstados] = useState({}); // clave -> { etapa, progreso }
  // Ref además del estado: dos clics en el mismo frame verían el estado
  // todavía sin actualizar; el ref corta el segundo envío al instante.
  const enCursoRef = useRef(new Set());

  const ejecutar = useCallback(async (clave, fn) => {
    if (enCursoRef.current.has(clave)) return undefined;
    enCursoRef.current.add(clave);
    setEstados((s) => ({ ...s, [clave]: { etapa: null, progreso: null } }));

    const actualizar = (parcial) =>
      setEstados((s) => (s[clave] ? { ...s, [clave]: { ...s[clave], ...parcial } } : s));
    const contexto = {
      // Cambia el texto del botón a mitad de camino (ej. "Subiendo
      // archivo…" y después "Guardando…").
      etapa: (texto) => actualizar({ etapa: texto, progreso: null }),
      // Se pasa tal cual a subirArchivo(archivo, subida). Al 100% ya se
      // enviaron todos los bytes y espera al servidor.
      subida: {
        onProgreso: (porcentaje) =>
          actualizar(porcentaje >= 100 ? { etapa: "Procesando archivo…", progreso: null } : { etapa: "Subiendo archivo…", progreso: porcentaje }),
      },
    };

    try {
      return await fn(contexto);
    } finally {
      enCursoRef.current.delete(clave);
      setEstados((s) => {
        const { [clave]: _terminada, ...resto } = s;
        return resto;
      });
    }
  }, []);

  const ocupado = useCallback((clave) => !!estados[clave], [estados]);

  // Texto para el botón mientras dura: la etapa actual (con % si es una
  // subida) o, si no hay etapa, el gerundio por defecto.
  const texto = useCallback(
    (clave, porDefecto) => {
      const e = estados[clave];
      if (!e?.etapa) return porDefecto;
      return e.progreso != null ? `${e.etapa} ${e.progreso}%` : e.etapa;
    },
    [estados]
  );

  return { ejecutar, ocupado, texto };
}
