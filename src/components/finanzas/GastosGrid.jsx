import { IconFile, IconUpload } from "../icons/Icons";
import Loading from "../shared/Loading";
import EstadoVacio from "../shared/EstadoVacio";
import EstadoError from "../shared/EstadoError";
import { soles, formatFecha } from "./finanzasUtils";

export default function GastosGrid({ cargando, error, onReintentar, gastos, onNuevo, onSubirComprobante }) {
  if (cargando) return <Loading texto="Cargando..." />;
  if (error) return <EstadoError error={error} onReintentar={onReintentar} />;
  if (gastos.length === 0) {
    return (
      <EstadoVacio
        titulo="No hay gastos registrados"
        descripcion='Puedes registrar uno nuevo con el botón "Nuevo gasto".'
        accionLabel="Nuevo gasto"
        onAccion={onNuevo}
      />
    );
  }

  return (
    <div className="fin-grid">
      {gastos.map((g) => (
        <div className="fin-card" key={g.id}>
          <div className="fin-card-header">
            <div>
              <div className="fin-card-titulo">{g.categoria}</div>
              <div className="fin-card-sub">
                {formatFecha(g.fecha)} · <span className={`co-badge ${g.empresa}`}>{g.empresa === "corevex" ? "Corevex" : "Electro"}</span>
              </div>
            </div>
            <span className="fin-card-monto">{soles(g.monto)}</span>
          </div>

          <div className="fin-card-body">
            {g.proveedor && <div><span className="fin-card-label">Proveedor</span><span>{g.proveedor}</span></div>}
            {g.trabajador && <div><span className="fin-card-label">Trabajador</span><span>{g.trabajador}</span></div>}
            {g.descripcion && <div><span className="fin-card-label">Descripción</span><span>{g.descripcion}</span></div>}

            {g.archivo ? (
              <a className="fin-card-archivo fin-card-archivo--link" href="#" onClick={(e) => e.preventDefault()}>
                <IconFile width={13} height={13} /> Ver comprobante
              </a>
            ) : (
              <label className="fin-card-archivo">
                <IconUpload width={13} height={13} /> Adjuntar comprobante
                <input type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={() => onSubirComprobante(g.id)} />
              </label>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
