import { Modal, ModalActions, CompanyChoice } from "../shared/Modal";

const OPCION_NUEVA = "__nueva__";

export default function ModalNuevoGasto({
  open,
  onClose,
  fGasto,
  setFGasto,
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
}) {
  return (
    <Modal open={open} title={editando ? "Editar gasto" : "Nuevo gasto"} subtitle="Registra un gasto de la empresa." onClose={onClose}>
      <form onSubmit={onSubmit}>
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
            <button className="btn-outline-sm" type="button" onClick={onAgregarCategoriaGasto}>
              Agregar categoría
            </button>
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
              <input required type="number" min="0" step="0.01" value={fGasto.monto} onChange={(e) => setFGasto({ ...fGasto, monto: e.target.value })} placeholder="0.00" />
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
        {error && <p className="field-error">{error}</p>}
        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">{editando ? "Guardar cambios" : "Guardar gasto"}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
