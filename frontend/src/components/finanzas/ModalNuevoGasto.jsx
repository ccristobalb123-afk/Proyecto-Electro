import { Modal, ModalActions, CompanyChoice } from "../shared/Modal";
import { BotonCarga } from "../shared/Carga";
import { IconCamera, IconUpload } from "../icons/Icons";
import { AYUDA_ARCHIVO } from "../../services/uploadsService";

const OPCION_NUEVA = "__nueva__";

const Obligatorio = () => (
  <span className="campo-obligatorio" aria-hidden="true">
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
    <div className="form-field">
      <span className="form-field-heading" id="doc-gasto-titulo">
        Foto o PDF del comprobante
        <Obligatorio />
      </span>
      <div className={`gasto-documento ${archivoNombre ? "has-file" : ""}`} aria-labelledby="doc-gasto-titulo">
        <p className="gasto-documento__estado" aria-live="polite">
          {archivoNombre ? <b>{archivoNombre}</b> : <>Sin documento — {AYUDA_ARCHIVO}</>}
        </p>
        <div className="gasto-documento__botones">
          <label className="btn-outline-sm gasto-documento__camara">
            <IconCamera width={15} height={15} />
            {archivoNombre ? "Tomar otra foto" : "Tomar foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="input-oculto" onChange={alElegir} />
          </label>
          <label className="btn-outline-sm">
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
          <p className="fin-faltantes" role="status">
            Faltan datos: {faltantes.join(" y ").toLowerCase()}. Complétalos para poder guardar.
          </p>
        )}
        <fieldset className="form-field">
          <legend>Empresa</legend>
          <CompanyChoice name="empresaGasto" value={fGasto.empresa} onChange={(v) => setFGasto({ ...fGasto, empresa: v })} />
        </fieldset>
        <div className="form-field">
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
          <div className="categoria-nueva-box">
            <div className="form-field">
              <label>
                Nombre de la categoría nueva
                <input
                  value={nombreNuevaCategoriaGasto}
                  onChange={(e) => setNombreNuevaCategoriaGasto(e.target.value)}
                  placeholder="Ej. Peajes"
                />
              </label>
              {errorCategoriaGasto && <p className="field-error">{errorCategoriaGasto}</p>}
            </div>
            <BotonCarga className="btn-outline-sm" cargando={creandoCategoria} textoCargando="Creando…" onClick={onAgregarCategoriaGasto}>
              Agregar categoría
            </BotonCarga>
          </div>
        )}

        <fieldset className="form-field">
          <legend>
            Tipo de comprobante
            <Obligatorio />
          </legend>
          <div className="igv-choice tipo-comprobante-choice">
            {[
              ["boleta", "Boleta"],
              ["factura", "Factura"],
            ].map(([valor, texto]) => (
              <label key={valor} className={fGasto.tipoComprobante === valor ? "sel" : ""}>
                <input
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
          <div className="form-field">
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
          <div className="form-field">
            <label>
              Trabajador
              <input value={fGasto.trabajador} onChange={(e) => setFGasto({ ...fGasto, trabajador: e.target.value })} placeholder="Nombre del trabajador" />
            </label>
          </div>
        ) : (
          <div className="form-field">
            <label>
              Proveedor (opcional)
              <input value={fGasto.proveedor} onChange={(e) => setFGasto({ ...fGasto, proveedor: e.target.value })} placeholder="Ej. Grifo Primax" />
            </label>
          </div>
        )}
        <div className="form-row">
          <div className="form-field">
            <label>
              Monto
              <input required type="number" inputMode="decimal" min="0" step="0.01" value={fGasto.monto} onChange={(e) => setFGasto({ ...fGasto, monto: e.target.value })} placeholder="0.00" />
            </label>
          </div>
          <div className="form-field">
            <label>
              Fecha
              <input required type="date" value={fGasto.fecha} onChange={(e) => setFGasto({ ...fGasto, fecha: e.target.value })} />
            </label>
          </div>
        </div>
        <div className="form-field">
          <label>
            Descripción (opcional)
            <input value={fGasto.descripcion} onChange={(e) => setFGasto({ ...fGasto, descripcion: e.target.value })} placeholder="Ej. Qué se compró" />
          </label>
        </div>
        <CampoDocumento archivoNombre={fGasto.archivoNombre} onElegir={onElegirArchivo} />

        {error && <p className="field-error" role="alert">{error}</p>}
        <ModalActions onCancel={onClose}>
          <BotonCarga type="submit" cargando={guardando} textoCargando={textoGuardando}>
            {editando ? "Guardar cambios" : "Guardar gasto"}
          </BotonCarga>
        </ModalActions>
      </form>
    </Modal>
  );
}
