import { AvisoVencimiento } from "../shared/Modal";
import { CAMPOS_EQUIPO, hoyEnPeru } from "./camposEquipo";

/**
 * Campos del tipo de equipo elegido, todos obligatorios (marcados con *).
 * Si se cambia de tipo con datos escritos, los que ya no aplican quedan
 * ocultos y no se guardan (ver valoresParaEnviar).
 */
export default function CamposEquipo({ campos, valores, onChange }) {
  const cambiar = (campo, valor) => onChange({ ...valores, [campo]: valor });
  const hoy = hoyEnPeru();
  // Pares de 2 columnas en escritorio; en celular se apilan (form-row).
  const textos = campos.filter((c) => !CAMPOS_EQUIPO[c].fecha);
  const fechas = campos.filter((c) => CAMPOS_EQUIPO[c].fecha);

  function campoInput(campo) {
    const meta = CAMPOS_EQUIPO[campo];
    const extra = meta.fecha
      ? {
          type: "date",
          ...(campo === "fechaFabricacion" ? { max: hoy } : {}),
          ...(campo === "fechaVencimiento" && valores.fechaInspeccion ? { min: valores.fechaInspeccion } : {}),
        }
      : { type: "text", maxLength: meta.maxLength, placeholder: meta.placeholder, ...meta.props };
    return (
      <div className="form-field" key={campo}>
        <label>
          <span>
            {meta.etiqueta}
            <span className="campo-obligatorio" aria-hidden="true"> *</span>
          </span>
          <input
            {...extra}
            required
            aria-required="true"
            value={valores[campo] ?? ""}
            onChange={(e) => {
              let v = e.target.value;
              if (meta.soloNumeros) v = v.replace(/\D/g, "");
              if (meta.mayusculas) v = v.toUpperCase();
              cambiar(campo, v);
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <>
      <p className="campos-obligatorios-nota">
        Los campos con <span className="campo-obligatorio">*</span> son obligatorios.
      </p>
      <div className="form-row">{textos.map(campoInput)}</div>
      <div className="form-row">{fechas.map(campoInput)}</div>
      {campos.includes("fechaVencimiento") && (
        <AvisoVencimiento
          hint="días antes del vencimiento de la inspección (1 a 365)"
          value={valores.diasAnticipacion}
          onChange={(v) => cambiar("diasAnticipacion", v)}
        />
      )}
    </>
  );
}
