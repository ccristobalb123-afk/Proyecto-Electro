import { IconUpload } from "../icons/Icons";
import { BotonVerArchivo } from "../shared/VisorArchivo";
import { useConfirm } from "../../context/ConfirmContext";
import { AYUDA_ARCHIVO } from "../../services/uploadsService";
import { documentosDisponibles } from "../../services/vehiculosService";

/**
 * Sección "Documentos" de Nuevo / Editar vehículo. Se marcan los que
 * aplican a este vehículo (solo esos se muestran en la ficha y generan
 * alertas), y de cada uno: fecha de inspección/emisión, vencimiento,
 * días de anticipación para el aviso y archivo (opcional, se puede
 * adjuntar después).
 */
export default function CamposDocumentosVehiculo({ documentos, onChange, tipoUnidad, errores = {} }) {
  const { confirmar } = useConfirm();

  const actualizar = (clave, cambios) => onChange({ ...documentos, [clave]: { ...documentos[clave], ...cambios } });

  async function alternar(info, marcado) {
    const d = documentos[info.clave];
    // Desmarcar uno ya guardado con datos borra su archivo y fechas al
    // guardar: se pide confirmación antes, no después.
    const tieneDatos = d.id && (d.archivoUrl || d.fechaEmision || d.fechaVencimiento);
    if (!marcado && tieneDatos) {
      const ok = await confirmar({
        titulo: `¿Quitar ${info.nombre} de este vehículo?`,
        mensaje: `Al guardar se eliminarán sus fechas${d.archivoUrl ? " y su archivo adjunto" : ""}, y dejará de generar alertas. Si te equivocaste, vuelve a marcarlo antes de guardar.`,
        tipo: "peligro",
        textoConfirmar: "Quitar documento",
      });
      if (!ok) return;
    }
    actualizar(info.clave, { marcado });
  }

  return (
    <fieldset className="form-field docs-vehiculo">
      <legend>Documentos</legend>
      <p className="campo-ayuda">Marca los que tiene este vehículo. Solo esos se muestran en su ficha y generan avisos de vencimiento.</p>

      {documentosDisponibles(tipoUnidad).map((info) => {
        const d = documentos[info.clave];
        const id = `doc-${info.clave}`;
        return (
          <div className={`doc-vehiculo ${d.marcado ? "doc-vehiculo--marcado" : ""}`} key={info.clave}>
            <label className="doc-vehiculo__check">
              <input type="checkbox" checked={d.marcado} onChange={(e) => alternar(info, e.target.checked)} />
              <span>{info.nombre}</span>
            </label>

            {d.marcado && (
              <div className="doc-vehiculo__campos">
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor={`${id}-emision`}>Inspección o emisión</label>
                    <input id={`${id}-emision`} type="date" value={d.fechaEmision} onChange={(e) => actualizar(info.clave, { fechaEmision: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label htmlFor={`${id}-vence`}>
                      Vencimiento{!info.vence && <span className="doc-vehiculo__opcional"> (opcional: puede no vencer)</span>}
                    </label>
                    <input
                      id={`${id}-vence`}
                      type="date"
                      value={d.fechaVencimiento}
                      min={d.fechaEmision || undefined}
                      onChange={(e) => actualizar(info.clave, { fechaVencimiento: e.target.value })}
                    />
                  </div>
                </div>

                <div className="aviso-field doc-vehiculo__aviso">
                  <label htmlFor={`${id}-dias`}>Avisarme antes del vencimiento</label>
                  <div className="aviso-input-row">
                    <input
                      id={`${id}-dias`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={365}
                      step={1}
                      value={d.diasAnticipacion}
                      onChange={(e) => actualizar(info.clave, { diasAnticipacion: e.target.value === "" ? "" : Number(e.target.value) })}
                    />
                    <span>días antes (1 a 365)</span>
                  </div>
                </div>

                <div className="doc-vehiculo__archivo">
                  {d.archivoUrl && !d.archivo && <BotonVerArchivo url={d.archivoUrl} nombre={d.archivoNombre} />}
                  <label className={`doc-chip doc-chip--elegir ${d.archivo ? "" : "doc-chip--opcional"}`} title={AYUDA_ARCHIVO}>
                    <IconUpload width={13} height={13} />
                    {d.archivo ? d.archivo.name : d.archivoUrl ? "Reemplazar archivo" : "Adjuntar archivo (opcional)"}
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      className="input-oculto"
                      onChange={(e) => {
                        const archivo = e.target.files?.[0];
                        e.target.value = "";
                        if (archivo) actualizar(info.clave, { archivo });
                      }}
                    />
                  </label>
                </div>

                {errores[info.clave] && (
                  <p className="field-error" role="alert">
                    {errores[info.clave]}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
