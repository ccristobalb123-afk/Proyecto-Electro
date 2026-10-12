import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "./Modal";
import Loading from "./Loading";
import EstadoError from "./EstadoError";
import { IconExternalLink, IconFile } from "../icons/Icons";
import { obtenerArchivo } from "../../services/uploadsService";
import "./VisorArchivo.css";

const EXT_IMAGEN = /\.(jpe?g|png|webp|gif)$/i;

/** "imagen" | "pdf" | "archivo", según la extensión de la URL guardada. */
function tipoDeArchivo(url = "") {
  if (EXT_IMAGEN.test(url)) return "imagen";
  if (/\.pdf$/i.test(url)) return "pdf";
  return "archivo";
}

const ETIQUETA_VER = { imagen: "Ver imagen", pdf: "Ver PDF", archivo: "Ver archivo" };

/**
 * Visor de fotos y PDFs subidos (/api/uploads/...). El archivo se pide
 * con fetch — pasando por la renovación automática de la sesión — y se
 * muestra desde un blob URL. Antes era un <a target="_blank"> directo
 * al archivo: pasados 15 min la cookie de acceso ya había vencido, el
 * navegador lo pedía sin renovarla y se abría un error en vez del archivo.
 */
export function VisorArchivo({ archivo, onClose }) {
  const [estado, setEstado] = useState({ cargando: true, error: null, blobUrl: null, mime: "" });
  const [intento, setIntento] = useState(0);
  const url = archivo?.url;

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let blobUrl = null;

    obtenerArchivo(url, { signal: controller.signal })
      .then((blob) => {
        blobUrl = URL.createObjectURL(blob);
        setEstado({ cargando: false, error: null, blobUrl, mime: blob.type });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setEstado({ cargando: false, error: err, blobUrl: null, mime: "" });
      });

    return () => {
      controller.abort();
      // Se libera con un margen: si se abrió en otra pestaña, esa
      // pestaña todavía puede estar leyendo el blob.
      if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    };
  }, [url, intento]);

  if (!archivo) return null;

  const tipo = estado.mime.startsWith("image/") ? "imagen" : estado.mime === "application/pdf" ? "pdf" : tipoDeArchivo(url);
  const nombre = archivo.nombre || (tipo === "pdf" ? "Documento PDF" : tipo === "imagen" ? "Imagen" : "Archivo");
  // Chrome en Android (y otros navegadores móviles) no muestran PDFs
  // dentro de un <iframe>: ahí se ofrece abrirlo con el visor del sistema.
  const pdfEnLinea = typeof navigator !== "undefined" && navigator.pdfViewerEnabled;

  return createPortal(
    <Modal open title={nombre} onClose={onClose} variant="visor">
      <div className="visor-cuerpo">
        {estado.cargando && <Loading texto="Abriendo archivo…" />}
        {estado.error && (
          <EstadoError
            error={estado.error}
            mensaje={estado.error.status === 404 ? "El archivo ya no existe en el servidor." : estado.error.message}
            onReintentar={() => {
              setEstado({ cargando: true, error: null, blobUrl: null, mime: "" });
              setIntento((n) => n + 1);
            }}
          />
        )}
        {estado.blobUrl && tipo === "imagen" && <img className="visor-imagen" src={estado.blobUrl} alt={nombre} />}
        {estado.blobUrl && tipo === "pdf" && pdfEnLinea && <iframe className="visor-pdf" src={estado.blobUrl} title={nombre} />}
        {estado.blobUrl && tipo !== "imagen" && !(tipo === "pdf" && pdfEnLinea) && (
          <div className="visor-sin-vista">
            <IconFile width={28} height={28} />
            <p>Este navegador no puede mostrar el {tipo === "pdf" ? "PDF" : "archivo"} aquí. Ábrelo o descárgalo con los botones de abajo.</p>
          </div>
        )}
      </div>

      {estado.blobUrl && (
        <div className="modal-actions visor-acciones">
          <a className="btn-secondary" href={estado.blobUrl} download={archivo.nombre || true}>
            Descargar
          </a>
          <a className="btn-primary" href={estado.blobUrl} target="_blank" rel="noreferrer">
            <IconExternalLink width={15} height={15} />
            Nueva pestaña
          </a>
        </div>
      )}
    </Modal>,
    document.body
  );
}

/**
 * Botón "Ver PDF / Ver imagen" que abre el visor. `className` permite
 * conservar el estilo de chip o enlace de cada pantalla.
 */
export function BotonVerArchivo({ url, nombre, className = "doc-chip", children, icono = true }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" className={`boton-ver-archivo ${className}`} onClick={() => setAbierto(true)}>
        {icono && <IconFile width={13} height={13} />}
        {children || ETIQUETA_VER[tipoDeArchivo(url)]}
      </button>
      {abierto && <VisorArchivo archivo={{ url, nombre }} onClose={() => setAbierto(false)} />}
    </>
  );
}
