import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "./Modal";
import Loading from "./Loading";
import EstadoError from "./EstadoError";
import { IconExternalLink, IconFile } from "../icons/Icons";
import { obtenerArchivo } from "../../services/uploadsService";
import "./VisorArchivo.css";
import { ACCIONES_VISOR, BOTON_SECUNDARIO } from "./clasesModal";

const EXT_IMAGEN = /\.(jpe?g|png|webp|gif)$/i;

/** "imagen" | "pdf" | "archivo", según la extensión de la URL guardada. */
function tipoDeArchivo(url = "") {
  if (EXT_IMAGEN.test(url)) return "imagen";
  if (/\.pdf$/i.test(url)) return "pdf";
  return "archivo";
}

// Los dos enlaces del pie. En «Nueva pestaña», .btn-primary (tokens.css, sin
// capa) ya fija display, alineación y separación con los mismos valores.
const ENLACE = "inline-flex items-center justify-center gap-1.5";

// Botón "Ver PDF / Ver imagen" (antes era un <a>): sin fondo, borde ni
// relleno de botón nativo, con la letra y el color del texto que lo rodea.
// Quien lo usa le pasa la clase de su pantalla: las que no tienen capa
// (.doc-chip…) mandan en color, fondo, relleno y letra; las de Tailwind
// (ARCHIVO_VER de Finanzas) suben su especificidad con [&&]: donde chocan.
const BOTON_VER = "[font:inherit] text-left [border:none] [background:none] p-0 [color:inherit]";

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
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded [background:var(--paper)]">
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
        {estado.blobUrl && tipo === "imagen" && <img className="block max-h-full max-w-full object-contain" src={estado.blobUrl} alt={nombre} />}
        {estado.blobUrl && tipo === "pdf" && pdfEnLinea && <iframe className="h-full w-full rounded [border:none] [background:var(--card)]" src={estado.blobUrl} title={nombre} />}
        {estado.blobUrl && tipo !== "imagen" && !(tipo === "pdf" && pdfEnLinea) && (
          <div className="flex max-w-[34ch] flex-col items-center gap-3 p-6 text-center text-muted">
            <IconFile width={28} height={28} />
            <p className="m-0 text-base">Este navegador no puede mostrar el {tipo === "pdf" ? "PDF" : "archivo"} aquí. Ábrelo o descárgalo con los botones de abajo.</p>
          </div>
        )}
      </div>

      {estado.blobUrl && (
        <div className={ACCIONES_VISOR}>
          <a className={`${BOTON_SECUNDARIO} ${ENLACE}`} href={estado.blobUrl} download={archivo.nombre || true}>
            Descargar
          </a>
          <a className={`btn-primary ${ENLACE}`} href={estado.blobUrl} target="_blank" rel="noreferrer">
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
      <button type="button" className={`${BOTON_VER} ${className}`} onClick={() => setAbierto(true)}>
        {icono && <IconFile width={13} height={13} />}
        {children || ETIQUETA_VER[tipoDeArchivo(url)]}
      </button>
      {abierto && <VisorArchivo archivo={{ url, nombre }} onClose={() => setAbierto(false)} />}
    </>
  );
}
