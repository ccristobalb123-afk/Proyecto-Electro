import { BotonCarga } from "../shared/Carga";
import { Modal, ModalActions, CompanyChoice } from "../shared/Modal";
import { TIPOS_UNIDAD } from "../../services/vehiculosService";
import CamposDocumentosVehiculo from "./CamposDocumentosVehiculo";

export default function ModalNuevoVehiculo({ open, onClose, fVehiculo, setFVehiculo, onSubmit, error, erroresDocumentos, guardando, textoGuardando }) {
  function cambiarTipoUnidad(tipoUnidad) {
    // El Brazo Hidráulico es solo de grúas: si deja de ser grúa, se desmarca.
    const documentos =
      tipoUnidad === "Grúa" ? fVehiculo.documentos : { ...fVehiculo.documentos, BRAZO_HIDRAULICO: { ...fVehiculo.documentos.BRAZO_HIDRAULICO, marcado: false } };
    setFVehiculo({ ...fVehiculo, tipoUnidad, documentos });
  }

  return (
    <Modal open={open} ocupado={guardando} wide title="Nuevo vehículo" subtitle="Completa los datos del vehículo." onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <div className="form-field">
            <label>
              Placa
              <input autoCapitalize="characters" autoCorrect="off" spellCheck={false} value={fVehiculo.placa} onChange={(e) => setFVehiculo({ ...fVehiculo, placa: e.target.value })} placeholder="Ej. A7P-925" />
            </label>
          </div>
          <div className="form-field">
            <label>
              Tipo de unidad
              <select value={fVehiculo.tipoUnidad} onChange={(e) => cambiarTipoUnidad(e.target.value)}>
                {TIPOS_UNIDAD.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <fieldset className="form-field">
          <legend>Empresa dueña</legend>
          <CompanyChoice name="empresaVehiculo" value={fVehiculo.empresa} onChange={(v) => setFVehiculo({ ...fVehiculo, empresa: v })} />
        </fieldset>

        <div className="form-field">
          <label>
            Cuadrilla / Proyecto
            <input value={fVehiculo.cuadrilla} onChange={(e) => setFVehiculo({ ...fVehiculo, cuadrilla: e.target.value })} placeholder="Ej. Cuadrilla Yerson H." />
          </label>
        </div>

        <CamposDocumentosVehiculo
          documentos={fVehiculo.documentos}
          onChange={(documentos) => setFVehiculo({ ...fVehiculo, documentos })}
          tipoUnidad={fVehiculo.tipoUnidad}
          errores={erroresDocumentos}
        />

        {error && <p className="field-error" role="alert">{error}</p>}

        <ModalActions onCancel={onClose}>
          <BotonCarga type="submit" cargando={guardando} textoCargando={textoGuardando}>
            Guardar vehículo
          </BotonCarga>
        </ModalActions>
      </form>
    </Modal>
  );
}
