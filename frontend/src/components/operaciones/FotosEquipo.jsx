import { useState } from "react";
import { IconCamera, IconUpload } from "../icons/Icons";
import { Spinner } from "../shared/Carga";
import { comprimirImagen } from "../../utils/imageUtils";
import { MANTENER } from "./camposEquipo";
import { ERROR_CAMPO } from "../shared/clasesModal";

// Cada foto: "Foto 1 · Actual/Nueva/Falta", la imagen (o el recuadro
// punteado si falta o se está procesando) y sus botones, apilados: en 360px
// cada columna mide ~140px.
const CHIP = "rounded-[999px] px-2 py-px text-xs font-semibold";
const CHIP_TONO = {
  Actual: "[background:var(--gray-tint)] text-gray-dark",
  Nueva: "[background:var(--success-tint)] text-success-dark",
  Falta: "[background:var(--danger-tint)] text-danger-dark",
};
// Falta la foto: borde rojo y texto (no solo color). No es un botón: se
// agrega con "Tomar foto" o "Elegir archivo".
const VACIO = `mb-0 flex h-full w-full cursor-default flex-col items-center justify-center gap-1.5 rounded border-[1.5px] border-dashed
  [background:var(--paper)] text-[12px] font-medium`;
const VACIO_FALTA = "border-danger text-danger-dark";
const VACIO_PROCESANDO = "border-border text-muted";
// Botones "Tomar foto" / "Elegir archivo". [&&]:m-0 le gana al margen de la
// etiqueta general de CAMPO. "foto-equipo__botones", "foto-equipo__camara" y
// "foto-equipo-slot" quedan como gancho: Modal.css (lo que fija
// .btn-outline-sm, sin capa, y el cursor) y los campos atenuados mientras se
// guarda.
const BOTON = "[&&]:m-0 justify-center whitespace-nowrap";

/**
 * Las 2 fotos de un equipo — siempre 2. Compartido por "Nuevo equipo",
 * "Editar fotos" y "Actualizar inspección". Cada foto se mantiene (la
 * actual, por defecto) o se cambia con "Tomar foto" (solo en celulares y
 * tablets, como en Gastos) o "Elegir archivo"; no se pueden quitar.
 * `valor`: [v0, v1], cada uno "actual", una foto nueva (data URL) o null
 * (falta). Cada foto nueva se comprime en el celular (JPEG de hasta
 * 1280 px), lo que puede tardar unos segundos: `onProcesando(true)` avisa
 * al modal para que no se pueda guardar a medias.
 */
export default function FotosEquipo({ actuales = [], valor, onChange, onProcesando }) {
  const [procesando, setProcesando] = useState(null); // índice en proceso
  const [error, setError] = useState("");

  async function cambiarFoto(indice, archivo) {
    if (!archivo) return;
    setError("");
    setProcesando(indice);
    onProcesando?.(true);
    try {
      const dataUrl = await comprimirImagen(archivo);
      onChange(valor.map((v, i) => (i === indice ? dataUrl : v)));
    } catch (err) {
      setError(err.message || "No se pudo procesar la foto. Prueba con otra imagen.");
    } finally {
      setProcesando(null);
      onProcesando?.(false);
    }
  }

  const alElegir = (indice) => (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    cambiarFoto(indice, archivo);
  };

  return (
    <>
      <div className="grid grid-cols-[1fr_1fr] gap-2.5">
        {[0, 1].map((indice) => {
          const v = valor[indice];
          const actual = actuales?.[indice];
          const src = v === MANTENER ? actual : v;
          const nueva = !!v && v !== MANTENER;
          // Etiqueta solo si hay algo que distinguir: en un equipo nuevo
          // (sin fotos) todas son nuevas.
          const conFotos = (actuales || []).some(Boolean);
          const etiqueta = !v ? "Falta" : v === MANTENER ? "Actual" : conFotos ? "Nueva" : null;
          return (
            <div className="flex min-w-0 flex-col gap-1.5" key={indice} role="group" aria-label={`Foto ${indice + 1}`}>
              <div className="flex items-center justify-between gap-1.5 text-sm font-semibold text-text">
                <span>Foto {indice + 1}</span>
                {etiqueta && <span className={`${CHIP} ${CHIP_TONO[etiqueta]}`}>{etiqueta}</span>}
              </div>
              <div className="foto-equipo-slot relative aspect-[4/3] overflow-hidden rounded">
                {procesando === indice ? (
                  <div className={`${VACIO} ${VACIO_PROCESANDO}`} role="status">
                    <Spinner tamano={20} />
                    <span>Procesando foto…</span>
                  </div>
                ) : src ? (
                  <img className="block h-full w-full object-cover" src={src} alt={`Foto ${indice + 1}${nueva ? " (nueva)" : ""}`} />
                ) : (
                  <div className={`${VACIO} ${VACIO_FALTA}`}>
                    <IconCamera width={20} height={20} />
                    <span>Falta la foto {indice + 1}</span>
                  </div>
                )}
              </div>
              <div className="foto-equipo__botones flex flex-col gap-1.5">
                <label className={`btn-outline-sm foto-equipo__camara ${BOTON}`}>
                  <IconCamera width={15} height={15} />
                  Tomar foto
                  <input type="file" accept="image/*" capture="environment" className="input-oculto" disabled={procesando !== null} onChange={alElegir(indice)} />
                </label>
                <label className={`btn-outline-sm ${BOTON}`}>
                  <IconUpload width={15} height={15} />
                  Elegir archivo
                  <input type="file" accept="image/*" className="input-oculto" disabled={procesando !== null} onChange={alElegir(indice)} />
                </label>
                {nueva && actual && (
                  <button type="button" className="link-button foto-equipo__mantener" onClick={() => onChange(valor.map((x, i) => (i === indice ? MANTENER : x)))}>
                    Mantener la actual
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {error && (
        <p className={ERROR_CAMPO} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
