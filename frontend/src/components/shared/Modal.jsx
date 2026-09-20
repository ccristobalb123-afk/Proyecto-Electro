import { useEffect, useId, useRef } from "react";
import { IconClose } from "../icons/Icons";
import "./Modal.css";

export function Modal({ open, title, subtitle, onClose, children, wide }) {
  const tituloId = useId();
  const dialogRef = useRef(null);

  // onClose casi siempre es una función nueva en cada render del padre
  // (una arrow function inline) — si el efecto de abajo dependiera
  // directamente de onClose, se volvería a ejecutar en CADA letra que
  // el usuario escribe en cualquier campo del formulario (porque
  // escribir dispara un setState en el padre, que re-renderiza, que
  // crea un onClose nuevo). Y ese efecto vuelve a robar el foco con
  // dialogRef.current.focus() — por eso el cursor "saltaba" del campo
  // mientras se escribía. Guardándolo en un ref, el efecto de abajo
  // solo depende de `open` de verdad, pero el handler de Escape sigue
  // usando siempre la versión más reciente de onClose.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Al abrir: mueve el foco adentro del modal (para teclado/lector de
  // pantalla) y guarda qué elemento lo abrió para devolverle el foco al
  // cerrar. Escape también cierra, como se espera de cualquier diálogo.
  // Tab/Shift+Tab quedan atrapados dentro del modal (focus trap) — sin
  // esto, seguir tabulando terminaba en elementos de la página de
  // atrás, invisibles detrás del overlay oscuro.
  useEffect(() => {
    if (!open) return;
    const disparador = document.activeElement;
    dialogRef.current?.focus();

    // El scroll de la página de atrás queda bloqueado mientras el
    // modal está abierto — evita el efecto raro de poder desplazar el
    // fondo con la rueda del mouse mientras hay un diálogo encima.
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function elementosFocalizables() {
      if (!dialogRef.current) return [];
      return Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const focalizables = elementosFocalizables();
      if (focalizables.length === 0) return;
      const primero = focalizables[0];
      const ultimo = focalizables[focalizables.length - 1];

      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowOriginal;
      disparador?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={`modal-electro ${wide ? "modal-wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id={tituloId} className="font-display">{title}</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Cerrar">
            <IconClose width={16} height={16} />
          </button>
        </div>
        {subtitle && <p className="modal-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ onCancel, cancelLabel = "Cancelar", children }) {
  return (
    <div className="modal-actions">
      <button className="btn-secondary" type="button" onClick={onCancel}>
        {cancelLabel}
      </button>
      {children}
    </div>
  );
}

// Selector visual "CorevexSAC / ElectroSAC" reutilizado en todos los
// formularios que registran algo con empresa.
export function CompanyChoice({ value, onChange, name }) {
  return (
    <div className="co-choice">
      <label className={value === "corevex" ? "sel-corevex" : ""}>
        <input
          type="radio"
          name={name}
          checked={value === "corevex"}
          onChange={() => onChange("corevex")}
        />
        CorevexSAC
      </label>
      <label className={value === "electro" ? "sel-electro" : ""}>
        <input
          type="radio"
          name={name}
          checked={value === "electro"}
          onChange={() => onChange("electro")}
        />
        ElectroSAC
      </label>
    </div>
  );
}

// Campo "días de anticipación" destacado en amarillo/voltio — el mismo
// patrón en Contratos, Cursos, Equipos, Vehículos y Facturas: todo lo
// que tiene fecha de vencimiento pide cuántos días antes avisar.
export function AvisoVencimiento({ value, onChange, hint }) {
  const inputId = useId();
  return (
    <div className="aviso-field">
      <label htmlFor={inputId}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        Aviso de vencimiento
      </label>
      <div className="aviso-input-row">
        <input
          id={inputId}
          type="number"
          min={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span>{hint || "días antes del vencimiento"}</span>
      </div>
    </div>
  );
}

// Campo de monto con selector de IGV — el usuario elige si lo que va a
// escribir ya incluye IGV o no; si no, el sistema le suma el 18%
// automáticamente y muestra el total resultante. `onChange` siempre
// recibe { montoBase, igvIncluido } juntos, para que el formulario
// padre calcule el montoTotal final al guardar.
export function CampoMontoConIgv({ montoBase, igvIncluido, onChange }) {
  const IGV = 0.18;
  const base = Number(montoBase) || 0;
  const totalConIgv = base * (1 + IGV);

  return (
    <>
      <fieldset className="form-field">
        <legend>IGV</legend>
        <div className="igv-choice">
          <label className={igvIncluido ? "sel" : ""}>
            <input
              type="radio"
              name="igvIncluido"
              checked={igvIncluido}
              onChange={() => onChange({ montoBase, igvIncluido: true })}
            />
            El monto ya incluye IGV
          </label>
          <label className={!igvIncluido ? "sel" : ""}>
            <input
              type="radio"
              name="igvIncluido"
              checked={!igvIncluido}
              onChange={() => onChange({ montoBase, igvIncluido: false })}
            />
            Agregar IGV (18%)
          </label>
        </div>
      </fieldset>

      <div className="form-field">
        <label>
          {igvIncluido ? "Monto total" : "Monto sin IGV"}
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={montoBase}
            onChange={(e) => onChange({ montoBase: e.target.value, igvIncluido })}
            placeholder="0.00"
          />
        </label>
        {!igvIncluido && base > 0 && (
          <p className="igv-resultado">
            Total con IGV: <b>S/ {totalConIgv.toFixed(2)}</b>
          </p>
        )}
      </div>
    </>
  );
}

// Historial tipo línea de tiempo — reutilizado en "Hoja de vida" de
// equipos/vehículos y en historiales de pago (Finanzas).
export function Timeline({ items }) {
  if (!items || items.length === 0) {
    return <p className="modal-mensaje-vacio">Aún no hay historial.</p>;
  }
  return (
    <div className="timeline">
      {items.map((item, i) => (
        <div className="tl-item" key={`${item.fecha}-${item.titulo}-${i}`}>
          <div className={`tl-dot ${item.tone || ""}`} />
          <div className="tl-body">
            <div className="tl-title">{item.titulo}</div>
            <div className="tl-meta">
              {item.fecha}
              {item.actor ? ` — ${item.actor}` : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatPorcentaje(p) {
  // 0.04 -> "4%", 0.015 -> "1.5%" — sin ceros de relleno.
  return `${Number((p * 100).toFixed(2))}%`;
}

// Selector de código de detracción — mismo criterio que
// CampoMontoConIgv: acá se muestra un cálculo EN VIVO solo como
// vista previa (monto de detracción y neto a pagar), pero quien manda
// de verdad es el backend, que recalcula con el % vigente al momento
// de guardar. `catalogo` viene ya cargado desde el hook (mismo patrón
// que categoriasGasto), no se pide acá adentro.
//
// IMPORTANTE: `montoTotal` debe ser el monto YA CON IGV aplicado (si
// corresponde) — la detracción siempre se calcula sobre el total real
// de la factura, nunca sobre el monto sin IGV. Quien use este
// componente debe calcular ese total antes de pasarlo acá (ver
// calcularMontoTotal en ModalNuevaFactura.jsx / ModalNuevaFacturaPagar.jsx).
export function CampoDetraccion({ catalogo, montoTotal, catalogoDetraccionId, detraccionMedioPago, detraccionCuentaBn, onChange }) {
  const seleccionado = catalogo.find((c) => c.id === catalogoDetraccionId) || null;
  const total = Number(montoTotal) || 0;
  const montoDetraccion = seleccionado ? Math.round(total * seleccionado.porcentaje * 100) / 100 : 0;

  return (
    <>
      <div className="form-field">
        <label>
          Detracción
          <select
            value={catalogoDetraccionId || ""}
            onChange={(e) =>
              onChange({
                catalogoDetraccionId: e.target.value ? Number(e.target.value) : null,
                detraccionMedioPago,
                detraccionCuentaBn,
              })
            }
          >
            <option value="">No aplica</option>
            {catalogo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} · {c.descripcion} ({formatPorcentaje(c.porcentaje)})
              </option>
            ))}
          </select>
        </label>
        {seleccionado && total > 0 && (
          <p className="igv-resultado">
            Detracción ({formatPorcentaje(seleccionado.porcentaje)}) sobre S/ {total.toFixed(2)}: <b>S/ {montoDetraccion.toFixed(2)}</b>
            {" · "}Neto a depositar: <b>S/ {(total - montoDetraccion).toFixed(2)}</b>
          </p>
        )}
      </div>

      {seleccionado && (
        <div className="form-row">
          <div className="form-field">
            <label>
              Medio de pago (opcional)
              <input
                value={detraccionMedioPago || ""}
                onChange={(e) => onChange({ catalogoDetraccionId, detraccionMedioPago: e.target.value, detraccionCuentaBn })}
                placeholder="Ej. Depósito en cuenta"
              />
            </label>
          </div>
          <div className="form-field">
            <label>
              Cuenta Banco de la Nación (opcional)
              <input
                value={detraccionCuentaBn || ""}
                onChange={(e) => onChange({ catalogoDetraccionId, detraccionMedioPago, detraccionCuentaBn: e.target.value })}
                placeholder="00099098309"
              />
            </label>
          </div>
        </div>
      )}
    </>
  );
}
