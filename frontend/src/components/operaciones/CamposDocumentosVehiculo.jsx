import { IconUpload } from "../icons/Icons";
import { BotonVerArchivo } from "../shared/VisorArchivo";
import { useConfirm } from "../../context/ConfirmContext";
import { AYUDA_ARCHIVO } from "../../services/uploadsService";
import { documentosDisponibles } from "../../services/vehiculosService";
import { AVISO, AVISO_ETIQUETA, AVISO_FILA, AVISO_INPUT, AVISO_TEXTO, AYUDA, CAMPO, ERROR_CAMPO, FILA } from "../shared/clasesModal";
import { CHIP_DOC, CHIP_DOC_OPCIONAL_VEHICULO } from "../shared/clasesDocumento";

// Cada documento es una fila con casilla; al marcarlo se despliegan sus
// campos. La casilla sube su especificidad con [&&]: para ganarle a la
// etiqueta general de CAMPO (display, margen y letra), como antes hacía
// .form-field .doc-vehiculo__check. El adjunto es el chip de documento
// compartido (clasesDocumento.js).
const DOC = "rounded border [background:var(--card)]";
const DOC_NORMAL = "border-border";
const DOC_MARCADO = "border-copper [box-shadow:0_0_0_1px_var(--copper-tint)]";
const DOC_CASILLA = `[&&]:m-0 [&&]:flex [&&]:text-base [&&]:font-semibold min-h-(--control-height-lg) cursor-pointer items-center gap-3
  px-3 py-2`;

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
    <fieldset className={`${CAMPO} docs-vehiculo flex flex-col gap-2`}>
      <legend>Documentos</legend>
      <p className={AYUDA}>Marca los que tiene este vehículo. Solo esos se muestran en su ficha y generan avisos de vencimiento.</p>

      {documentosDisponibles(tipoUnidad).map((info) => {
        const d = documentos[info.clave];
        const id = `doc-${info.clave}`;
        return (
          <div className={`${DOC} ${d.marcado ? DOC_MARCADO : DOC_NORMAL}`} key={info.clave}>
            <label className={DOC_CASILLA}>
              <input className="h-[18px] w-[18px] shrink-0 accent-copper" type="checkbox" checked={d.marcado} onChange={(e) => alternar(info, e.target.checked)} />
              <span>{info.nombre}</span>
            </label>

            {d.marcado && (
              <div className="border-t border-t-border px-3 pt-3 pb-1">
                <div className={FILA}>
                  <div className={CAMPO}>
                    <label htmlFor={`${id}-emision`}>Inspección o emisión</label>
                    <input id={`${id}-emision`} type="date" value={d.fechaEmision} onChange={(e) => actualizar(info.clave, { fechaEmision: e.target.value })} />
                  </div>
                  <div className={CAMPO}>
                    <label htmlFor={`${id}-vence`}>
                      Vencimiento{!info.vence && <span className="font-regular text-muted"> (opcional: puede no vencer)</span>}
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

                <div className={`${AVISO} p-3`}>
                  <label className={AVISO_ETIQUETA} htmlFor={`${id}-dias`}>Avisarme antes del vencimiento</label>
                  <div className={AVISO_FILA}>
                    <input
                      className={AVISO_INPUT}
                      id={`${id}-dias`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={365}
                      step={1}
                      value={d.diasAnticipacion}
                      onChange={(e) => actualizar(info.clave, { diasAnticipacion: e.target.value === "" ? "" : Number(e.target.value) })}
                    />
                    <span className={AVISO_TEXTO}>días antes (1 a 365)</span>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2 [&_.doc-chip]:max-w-full [&_.doc-chip]:[overflow-wrap:anywhere]">
                  {d.archivoUrl && !d.archivo && <BotonVerArchivo url={d.archivoUrl} nombre={d.archivoNombre} />}
                  <label className={d.archivo ? `${CHIP_DOC} cursor-pointer` : CHIP_DOC_OPCIONAL_VEHICULO} title={AYUDA_ARCHIVO}>
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
                  <p className={ERROR_CAMPO} role="alert">
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
