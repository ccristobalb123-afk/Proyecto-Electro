import { useState } from "react";
import { IconCamera, IconUpload } from "../icons/Icons";
import { Spinner } from "../shared/Carga";
import { comprimirImagen } from "../../utils/imageUtils";
import { MANTENER } from "./camposEquipo";

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
      <div className="fotos-equipo-row">
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
            <div className="foto-equipo" key={indice} role="group" aria-label={`Foto ${indice + 1}`}>
              <div className="foto-equipo__cabecera">
                <span>Foto {indice + 1}</span>
                {etiqueta && <span className={`foto-equipo__chip foto-equipo__chip--${etiqueta.toLowerCase()}`}>{etiqueta}</span>}
              </div>
              <div className="foto-equipo-slot">
                {procesando === indice ? (
                  <div className="foto-equipo-vacio foto-equipo-procesando" role="status">
                    <Spinner tamano={20} />
                    <span>Procesando foto…</span>
                  </div>
                ) : src ? (
                  <img className="foto-equipo__img" src={src} alt={`Foto ${indice + 1}${nueva ? " (nueva)" : ""}`} />
                ) : (
                  <div className="foto-equipo-vacio foto-equipo-vacio--falta">
                    <IconCamera width={20} height={20} />
                    <span>Falta la foto {indice + 1}</span>
                  </div>
                )}
              </div>
              <div className="foto-equipo__botones">
                <label className="btn-outline-sm foto-equipo__camara">
                  <IconCamera width={15} height={15} />
                  Tomar foto
                  <input type="file" accept="image/*" capture="environment" className="input-oculto" disabled={procesando !== null} onChange={alElegir(indice)} />
                </label>
                <label className="btn-outline-sm">
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
        <p className="field-error foto-equipo-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
