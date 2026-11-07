import { Modal, ModalActions, CompanyChoice } from "../shared/Modal";
import { BotonCarga } from "../shared/Carga";
import { IconCamera, IconUpload } from "../icons/Icons";
import { AYUDA_ARCHIVO } from "../../services/uploadsService";
import { CAJA_CATEGORIA, CAMPO, ERROR_CAMPO, FILA, OBLIGATORIO, OPCION, OPCION_ELEGIDA, OPCION_NORMAL, OPCION_RADIO, OPCIONES_FILA, TITULO_CAMPO } from "../shared/clasesModal";

// Recuadro del documento: punteado sin archivo, verde con archivo. Mientras
// se guarda, sus botones se atenúan y no responden (modal-cuerpo es el
// <fieldset> del modal, que se deshabilita).
const DOCUMENTO = `flex flex-col gap-2.5 rounded border-[1.5px] p-3.5
  [.modal-cuerpo:disabled_&_label]:pointer-events-none [.modal-cuerpo:disabled_&_label]:opacity-60`;
const DOCUMENTO_SIN = "border-dashed border-border";
const DOCUMENTO_CON = "border-solid border-success bg-success-tint";
const DOCUMENTO_ESTADO = "m-0 text-[13px] wrap-anywhere";
// "gasto-documento__botones" y "gasto-documento__camara" quedan como gancho
// de Finanzas.css (separación de los botones y la cámara solo en pantallas
// táctiles: .btn-outline-sm, sin capa, fija display y gap).
const BOTONES = "gasto-documento__botones flex flex-wrap gap-2";
const BOTON_ARCHIVO = "btn-outline-sm cursor-pointer justify-center [flex:1_1_140px]";
const FALTANTES = "mx-0 mt-0 mb-4 rounded bg-volt-tint px-3 py-2 text-[13px] leading-[1.4] text-volt-dark";

const OPCION_NUEVA = "__nueva__";

const Obligatorio = () => (
  <span className={OBLIGATORIO} aria-hidden="true">
    {" "}*
  </span>
);

// Documento del gasto (obligatorio): "Tomar foto" abre la cámara del
// celular (solo se muestra en pantallas táctiles) y "Elegir archivo" el
// explorador o la galería. Mismos formatos y límite que el resto.
function CampoDocumento({ archivoNombre, onElegir }) {
  const alElegir = (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (archivo) onElegir(archivo);
  };
  return (
    <div className={CAMPO}>
      <span className={TITULO_CAMPO} id="doc-gasto-titulo">
        Foto o PDF del comprobante
        <Obligatorio />
      </span>
      <div className={`${DOCUMENTO} ${archivoNombre ? DOCUMENTO_CON : DOCUMENTO_SIN}`} aria-labelledby="doc-gasto-titulo">
        <p className={`${DOCUMENTO_ESTADO} ${archivoNombre ? "text-success-dark" : "text-muted"}`} aria-live="polite">
          {archivoNombre ? <b>{archivoNombre}</b> : <>Sin documento — {AYUDA_ARCHIVO}</>}
        </p>
        <div className={BOTONES}>
          <label className={`${BOTON_ARCHIVO} gasto-documento__camara`}>
            <IconCamera width={15} height={15} />
            {archivoNombre ? "Tomar otra foto" : "Tomar foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="input-oculto" onChange={alElegir} />
          </label>
          <label className={BOTON_ARCHIVO}>
            <IconUpload width={15} height={15} />
            {archivoNombre ? "Reemplazar archivo" : "Elegir archivo"}
            <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="input-oculto" onChange={alElegir} />
          </label>
        </div>
      </div>
    </div>
  );
}

export default function ModalNuevoGasto({
  open,
  onClose,
  fGasto,
  setFGasto,
  onElegirArchivo,
  faltantes = [],
  onSubmit,
  editando,
  categoriasGasto,
  nuevaCategoriaGasto,
  setNuevaCategoriaGasto,
  nombreNuevaCategoriaGasto,
  setNombreNuevaCategoriaGasto,
  errorCategoriaGasto,
  onAgregarCategoriaGasto,
  onAbrirGestionCategorias,
  error,
  guardando,
  textoGuardando,
  creandoCategoria,
}) {
  return (
    <Modal open={open} ocupado={guardando} title={editando ? "Editar gasto" : "Nuevo gasto"} subtitle="Registra un gasto de la empresa." onClose={onClose}>
      <form onSubmit={onSubmit}>
        {/* Gasto anterior al tipo y documento obligatorios: se piden ahora. */}
        {editando && faltantes.length > 0 && (
          <p className={FALTANTES} role="status">
            Faltan datos: {faltantes.join(" y ").toLowerCase()}. Complétalos para poder guardar.
          </p>
        )}
        <fieldset className={CAMPO}>
          <legend>Empresa</legend>
          <CompanyChoice name="empresaGasto" value={fGasto.empresa} onChange={(v) => setFGasto({ ...fGasto, empresa: v })} />
        </fieldset>
        <div className={CAMPO}>
          <label>
            Categoría
            <select
              value={nuevaCategoriaGasto ? OPCION_NUEVA : fGasto.categoria}
              onChange={(e) => {
                if (e.target.value === OPCION_NUEVA) {
                  setNuevaCategoriaGasto(true);
                } else {
                  setNuevaCategoriaGasto(false);
                  setFGasto({ ...fGasto, categoria: e.target.value });
                }
              }}
            >
              {categoriasGasto.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value={OPCION_NUEVA}>+ Nueva categoría...</option>
            </select>
          </label>
          <button className="link-button" type="button" onClick={onAbrirGestionCategorias}>
            Gestionar categorías
          </button>
        </div>

        {nuevaCategoriaGasto && (
          <div className={CAJA_CATEGORIA}>
            <div className={CAMPO}>
              <label>
                Nombre de la categoría nueva
                <input
                  value={nombreNuevaCategoriaGasto}
                  onChange={(e) => setNombreNuevaCategoriaGasto(e.target.value)}
                  placeholder="Ej. Peajes"
                />
              </label>
              {errorCategoriaGasto && <p className={ERROR_CAMPO}>{errorCategoriaGasto}</p>}
            </div>
            <BotonCarga className="btn-outline-sm" cargando={creandoCategoria} textoCargando="Creando…" onClick={onAgregarCategoriaGasto}>
              Agregar categoría
            </BotonCarga>
          </div>
        )}

        <fieldset className={CAMPO}>
          <legend>
            Tipo de comprobante
            <Obligatorio />
          </legend>
          <div className={OPCIONES_FILA}>
            {[
              ["boleta", "Boleta"],
              ["factura", "Factura"],
            ].map(([valor, texto]) => (
              <label key={valor} className={`${OPCION} ${fGasto.tipoComprobante === valor ? OPCION_ELEGIDA : OPCION_NORMAL}`}>
                <input
                  className={OPCION_RADIO}
                  type="radio"
                  name="tipoComprobante"
                  checked={fGasto.tipoComprobante === valor}
                  onChange={() => setFGasto({ ...fGasto, tipoComprobante: valor })}
                />
                {texto}
              </label>
            ))}
          </div>
        </fieldset>

        {fGasto.tipoComprobante === "factura" && (
          <div className={CAMPO}>
            <label>
              <span>
                RUC del proveedor
                <Obligatorio />
              </span>
              <input
                inputMode="numeric"
                autoComplete="off"
                maxLength={11}
                value={fGasto.rucProveedor}
                onChange={(e) => setFGasto({ ...fGasto, rucProveedor: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                placeholder="11 dígitos, ej. 20100047218"
              />
            </label>
          </div>
        )}

        {fGasto.categoria === "Bono" ? (
          <div className={CAMPO}>
            <label>
              Trabajador
              <input value={fGasto.trabajador} onChange={(e) => setFGasto({ ...fGasto, trabajador: e.target.value })} placeholder="Nombre del trabajador" />
            </label>
          </div>
        ) : (
          <div className={CAMPO}>
            <label>
              Proveedor (opcional)
              <input value={fGasto.proveedor} onChange={(e) => setFGasto({ ...fGasto, proveedor: e.target.value })} placeholder="Ej. Grifo Primax" />
            </label>
          </div>
        )}
        <div className={FILA}>
          <div className={CAMPO}>
            <label>
              Monto
              <input required type="number" inputMode="decimal" min="0" step="0.01" value={fGasto.monto} onChange={(e) => setFGasto({ ...fGasto, monto: e.target.value })} placeholder="0.00" />
            </label>
          </div>
          <div className={CAMPO}>
            <label>
              Fecha
              <input required type="date" value={fGasto.fecha} onChange={(e) => setFGasto({ ...fGasto, fecha: e.target.value })} />
            </label>
          </div>
        </div>
        <div className={CAMPO}>
          <label>
            Descripción (opcional)
            <input value={fGasto.descripcion} onChange={(e) => setFGasto({ ...fGasto, descripcion: e.target.value })} placeholder="Ej. Qué se compró" />
          </label>
        </div>
        <CampoDocumento archivoNombre={fGasto.archivoNombre} onElegir={onElegirArchivo} />

        {error && <p className={ERROR_CAMPO} role="alert">{error}</p>}
        <ModalActions onCancel={onClose}>
          <BotonCarga type="submit" cargando={guardando} textoCargando={textoGuardando}>
            {editando ? "Guardar cambios" : "Guardar gasto"}
          </BotonCarga>
        </ModalActions>
      </form>
    </Modal>
  );
}
