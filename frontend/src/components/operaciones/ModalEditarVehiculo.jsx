import { BotonCarga } from "../shared/Carga";
import { Modal, ModalActions } from "../shared/Modal";
import CamposDocumentosVehiculo from "./CamposDocumentosVehiculo";

export default function ModalEditarVehiculo({ open, onClose, fVehiculo, setFVehiculo, onSubmit, error, erroresDocumentos, tipoUnidad, guardando, textoGuardando }) {
  return (
    <Modal open={open} ocupado={guardando} wide title="Editar vehículo" subtitle={fVehiculo.placa} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label>
            Placa
            <input required autoCapitalize="characters" autoCorrect="off" spellCheck={false} value={fVehiculo.placa} onChange={(e) => setFVehiculo({ ...fVehiculo, placa: e.target.value })} />
          </label>
        </div>
        <div className="form-field">
          <label>
            Cuadrilla (opcional)
            <input value={fVehiculo.cuadrilla} onChange={(e) => setFVehiculo({ ...fVehiculo, cuadrilla: e.target.value })} placeholder="Ej. Cuadrilla 3" />
          </label>
        </div>
        {fVehiculo.documentos && (
          <CamposDocumentosVehiculo
            documentos={fVehiculo.documentos}
            onChange={(documentos) => setFVehiculo({ ...fVehiculo, documentos })}
            tipoUnidad={tipoUnidad}
            errores={erroresDocumentos}
          />
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
