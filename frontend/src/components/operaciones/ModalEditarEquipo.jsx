import { BotonCarga } from "../shared/Carga";
import { Modal, ModalActions } from "../shared/Modal";
import CamposEquipo from "./CamposEquipo";

// Mismos campos por tipo que al registrar. Un equipo anterior al que le
// falte un dato obligatorio de su tipo lo muestra arriba y no se guarda
// hasta completarlo. Categoría antigua sin tipo (si existiera): se edita
// como antes, con su código y sus campos libres.
export default function ModalEditarEquipo({ open, onClose, equipo, fEquipo, setFEquipo, tipos, onSubmit, error, guardando, textoGuardando }) {
  const tipo = tipos.find((t) => t.nombre === fEquipo.categoria);
  const opciones = tipos.filter((t) => !t.antigua || t.nombre === equipo?.categoria);

  return (
    <Modal open={open} ocupado={guardando} title="Editar equipo" subtitle={equipo?.identificador} onClose={onClose}>
      <form onSubmit={onSubmit}>
        {equipo?.faltantes?.length > 0 && fEquipo.categoria === equipo.categoria && (
          <p className="equipo-faltantes" role="status">
            Completa los datos que faltan: {equipo.faltantes.join(", ")}.
          </p>
        )}

        <div className="form-field">
          <label>
            <span>
              Tipo de equipo<span className="campo-obligatorio" aria-hidden="true"> *</span>
            </span>
            <select required value={fEquipo.categoria} onChange={(e) => setFEquipo({ ...fEquipo, categoria: e.target.value })}>
              {opciones.map((t) => (
                <option key={t.nombre} value={t.nombre}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        {tipo && !tipo.antigua && (
          <CamposEquipo campos={tipo.campos} valores={fEquipo.valores} onChange={(valores) => setFEquipo((f) => ({ ...f, valores }))} />
        )}

        {tipo?.antigua && (
          <div className="form-row">
            <div className="form-field">
              <label>
                Código
                <input
                  required
                  autoCapitalize="characters"
                  value={fEquipo.valores.codigo}
                  onChange={(e) => setFEquipo((f) => ({ ...f, valores: { ...f.valores, codigo: e.target.value.toUpperCase() } }))}
                />
              </label>
            </div>
            {(tipo.camposLibres || []).map((campo) => (
              <div className="form-field" key={campo.nombre}>
                <label>
                  {campo.nombre}
                  <input
                    placeholder={campo.placeholder}
                    value={fEquipo.camposValores[campo.nombre] || ""}
                    onChange={(e) => setFEquipo((f) => ({ ...f, camposValores: { ...f.camposValores, [campo.nombre]: e.target.value } }))}
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        {error && <p className="field-error" role="alert">{error}</p>}
        <ModalActions onCancel={onClose}>
          <BotonCarga type="submit" cargando={guardando} textoCargando={textoGuardando}>
            Guardar cambios
          </BotonCarga>
        </ModalActions>
      </form>
    </Modal>
  );
}
