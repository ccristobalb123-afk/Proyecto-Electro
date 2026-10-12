import { useState } from "react";
import { IconCamera, IconTrash } from "../icons/Icons";
import { Spinner } from "../shared/Carga";
import { comprimirImagen } from "../../utils/imageUtils";

/**
 * Las 2 fotos de un equipo — compartido por "Nuevo equipo" y "Editar
 * fotos". Cada foto se comprime en el celular antes de guardarla, lo que
 * puede tardar unos segundos: mientras tanto el recuadro muestra
 * "Procesando foto…" y `onProcesando(true)` avisa al modal para que no
 * se pueda guardar a medias.
 */
export default function FotosEquipo({ fotos = [null, null], onChange, onProcesando }) {
  const [procesando, setProcesando] = useState(null); // índice en proceso
  const [error, setError] = useState("");

  async function cambiarFoto(indice, archivo) {
    if (!archivo) return;
    setError("");
    setProcesando(indice);
    onProcesando?.(true);
    try {
      const dataUrl = await comprimirImagen(archivo);
      const nuevas = [...fotos];
      nuevas[indice] = dataUrl;
      onChange(nuevas);
    } catch (err) {
      setError(err.message || "No se pudo procesar la foto. Prueba con otra imagen.");
    } finally {
      setProcesando(null);
      onProcesando?.(false);
    }
  }

  function quitarFoto(indice) {
    const nuevas = [...fotos];
    nuevas[indice] = null;
    onChange(nuevas);
  }

  const inputFoto = (indice) => (
    // accept+capture: en celular abre la cámara directo; en computadora
    // abre el explorador de archivos normal.
    <input
      type="file"
      accept="image/*"
      capture="environment"
      className="input-oculto"
      onChange={(e) => {
        const archivo = e.target.files?.[0];
        e.target.value = "";
        cambiarFoto(indice, archivo);
      }}
    />
  );

  return (
    <>
      <div className="fotos-equipo-row">
        {[0, 1].map((indice) => {
          const foto = fotos[indice];
          return (
            <div className="foto-equipo-slot" key={indice}>
              {procesando === indice ? (
                <div className="foto-equipo-vacio foto-equipo-procesando" role="status">
                  <Spinner tamano={20} />
                  <span>Procesando foto…</span>
                </div>
              ) : foto ? (
                <>
                  {/* Tocar la foto reemplaza directo — subir una nueva
                      descarta automáticamente la anterior. */}
                  <label className="foto-equipo-reemplazar" title="Tocar para reemplazar">
                    <img src={foto} alt={`Foto ${indice + 1}`} />
                    <div className="foto-equipo-reemplazar-hint">
                      <IconCamera width={16} height={16} />
                      <span>Cambiar</span>
                    </div>
                    {inputFoto(indice)}
                  </label>
                  <button className="foto-equipo-quitar" type="button" title="Quitar foto" aria-label={`Quitar foto ${indice + 1}`} onClick={() => quitarFoto(indice)}>
                    <IconTrash width={13} height={13} />
                  </button>
                </>
              ) : (
                <label className="foto-equipo-vacio">
                  <IconCamera width={20} height={20} />
                  <span>Agregar foto</span>
                  {inputFoto(indice)}
                </label>
              )}
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
