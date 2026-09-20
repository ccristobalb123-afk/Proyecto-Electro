import { Modal, ModalActions } from "../shared/Modal";

export default function ModalEditarEquipo({ open, onClose, fEquipo, setFEquipo, categorias, onSubmit, error }) {
  function handleCategoriaChange(nuevaCategoria) {
    setFEquipo({ ...fEquipo, categoria: nuevaCategoria, camposValores: {} });
  }

  return (
    <Modal open={open} title="Editar equipo" subtitle={fEquipo.codigo} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label>
            Código
            <input required value={fEquipo.codigo} onChange={(e) => setFEquipo({ ...fEquipo, codigo: e.target.value })} />
          </label>
        </div>

        <div className="form-field">
          <label>
            Categoría
            <select value={fEquipo.categoria} onChange={(e) => handleCategoriaChange(e.target.value)}>
              {Object.keys(categorias).map((nombre) => (
                <option key={nombre} value={nombre}>{nombre}</option>
              ))}
            </select>
          </label>
        </div>

        {fEquipo.categoria && (categorias[fEquipo.categoria] || []).length > 0 && (
          <div className="form-row">
            {(categorias[fEquipo.categoria] || []).map((campo) => (
              <div className="form-field" key={campo.nombre}>
                <label>
                  {campo.nombre}
                  <input
                    placeholder={campo.placeholder}
                    value={fEquipo.camposValores[campo.nombre] || ""}
                    onChange={(e) =>
                      setFEquipo({
                        ...fEquipo,
                        camposValores: { ...fEquipo.camposValores, [campo.nombre]: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        {error && <p className="field-error">{error}</p>}
        <ModalActions onCancel={onClose}>
          <button className="btn-primary" type="submit">Guardar cambios</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
