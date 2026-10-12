import { IconUpload } from "../icons/Icons";
import { BotonVerArchivo } from "../shared/VisorArchivo";
import { Spinner } from "../shared/Carga";
import { AYUDA_ARCHIVO } from "../../services/uploadsService";

/**
 * Comprobante de una factura, factura por pagar o gasto: "Ver
 * comprobante" si ya tiene, "Adjuntar comprobante" si no, y mientras se
 * sube, "Subiendo archivo… 40%" (`estado` viene de useAccion).
 */
export default function CampoComprobante({ item, estado, onSubir }) {
  if (estado) {
    return (
      <span className="fin-card-archivo fin-card-archivo--subiendo" role="status">
        <Spinner tamano={13} />
        {estado}
      </span>
    );
  }
  if (item.archivo) {
    return (
      <BotonVerArchivo className="fin-card-archivo fin-card-archivo--link" url={item.archivoUrl} nombre={item.archivoNombre}>
        Ver comprobante
      </BotonVerArchivo>
    );
  }
  return (
    <label className="fin-card-archivo" title={AYUDA_ARCHIVO}>
      <IconUpload width={13} height={13} /> Adjuntar comprobante
      <input
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="input-oculto"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          e.target.value = ""; // permite volver a elegir el mismo archivo si falló
          if (archivo) onSubir(item.id, archivo);
        }}
      />
    </label>
  );
}
