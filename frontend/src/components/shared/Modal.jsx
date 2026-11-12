import { useEffect, useId, useRef } from "react";
import { IconClose } from "../icons/Icons";
import { useBloquearScroll } from "../../hooks/useBloquearScroll";
import "./Modal.css";
import { ACCIONES, BOTON_SECUNDARIO, MENSAJE_VACIO, CAMPO, FILA, AVISO, AVISO_RELLENO, AVISO_ETIQUETA, AVISO_FILA, AVISO_INPUT, AVISO_TEXTO, OPCIONES, OPCION, OPCION_NORMAL, OPCION_ELEGIDA, OPCION_RADIO } from "./clasesModal";
import { urlMiniatura } from "../../utils/fotosEquipo";

// Clases que quedan como gancho de otras reglas (no dan estilo por sí solas):
// - modal-overlay y open: ToastContainer.css (body:has(.modal-overlay.open)).
// - modal--{variant}: motion.css (seguridad).
// - modal-electro: responsive.css (.modal-electro .form-row…).
// - modal-cuerpo: ModalNuevoGasto.jsx (documento del gasto atenuado mientras se guarda).
// Las variantes («seguridad», «visor») cambian propiedades que la base
// también fija: por eso cada una tiene su constante y no se suman dos clases
// de la misma propiedad en un elemento.

// Fondo oscuro. En celular deja un margen alrededor del modal (y respeta la
// muesca); en celular horizontal (apaisado:, poca altura), uno más chico.
const FONDO = `modal-overlay open fixed inset-0 z-(--z-modal) flex items-center justify-center
  max-md:px-3 max-md:pt-[max(var(--space-3),env(safe-area-inset-top))] max-md:pb-[max(var(--space-3),env(safe-area-inset-bottom))]
  apaisado:px-2 apaisado:pt-[max(var(--space-2),env(safe-area-inset-top))] apaisado:pb-[max(var(--space-2),env(safe-area-inset-bottom))]`;
const FONDO_COLOR = "[background:color-mix(in_srgb,var(--ink-2)_50%,transparent)]";

// La caja del modal. En celular usa todo el ancho y el alto disponibles.
// El ancho va en dos constantes (normal y wide) para no poner dos w- en el
// mismo elemento.
const CAJA = "modal-electro rounded-[14px] [background:var(--card)] overscroll-contain focus:[outline:none]";
const CAJA_FORMULARIO = `max-w-[92vw] max-h-[88vh] supports-[max-height:88dvh]:max-h-[88dvh] overflow-y-auto px-7 py-[26px]
  max-md:w-full max-md:max-w-full max-md:px-4
  apaisado:max-h-full apaisado:px-6 apaisado:py-[18px]`;
const CAJA_MOVIL = "max-md:max-h-full max-md:py-5";
const ANCHO = "w-[460px]";
const ANCHO_WIDE = "w-[560px]";

// Variante «seguridad» (cambio de contraseña): entra en 200ms (ease-out)
// desde un desplazamiento corto y una línea ámbar se dibuja en el borde
// superior, el mismo lenguaje del riel del Login. En celular pasa a hoja
// inferior, al alcance del pulgar. Los @keyframes están en Modal.css; con
// movimiento reducido, motion.css deja solo el fundido (gancho:
// modal--seguridad).
const FONDO_SEGURIDAD = "[animation:modal-seguridad-fondo_150ms_ease-out_both] max-md:items-end";
const CAJA_SEGURIDAD = `relative [animation:modal-seguridad-entrada_200ms_var(--ease-out)_both]
  before:absolute before:top-0 before:right-7 before:left-7 before:h-0.5 before:origin-left before:[background:var(--volt)]
  before:[animation:modal-seguridad-trazo_300ms_var(--ease-out)_120ms_both]
  max-md:max-h-[92vh] max-md:supports-[max-height:92dvh]:max-h-[92dvh] max-md:rounded-[16px_16px_0_0]
  max-md:pt-5 max-md:pb-[max(26px,env(safe-area-inset-bottom))] max-md:[animation:modal-seguridad-hoja_280ms_var(--ease-out)_both]`;

// Variante «visor» (VisorArchivo: fotos y PDFs): casi toda la pantalla en
// escritorio y la pantalla completa en celular, sin scroll (la imagen se
// ajusta sola), con el nombre del archivo arriba y las acciones abajo. Los
// @keyframes están en VisorArchivo.css; con movimiento reducido, sin animación.
const FONDO_VISOR = "[background:rgba(15,19,24,0.8)] [animation:visor-fondo_150ms_ease-out_both] motion-reduce:[animation:none]";
const CAJA_VISOR = `flex h-[90vh] max-h-none w-[min(960px,96vw)] max-w-[96vw] flex-col overflow-hidden px-5 py-4 supports-[height:90dvh]:h-[90dvh]
  [animation:visor-entrada_200ms_var(--ease-out)_both] motion-reduce:[animation:none]
  max-md:h-screen max-md:w-full max-md:max-w-full max-md:rounded-none max-md:px-3 max-md:supports-[height:100dvh]:h-dvh
  max-md:pt-[max(var(--space-3),env(safe-area-inset-top))] max-md:pb-[max(var(--space-3),env(safe-area-inset-bottom))]`;

// Encabezado: título y botón de cerrar. modal-close queda como gancho:
// responsive.css (44px táctiles). En el visor, nombres de archivo largos
// ("Certificado_SCTR_Juan_Perez_2026.pdf") se cortan con puntos suspensivos
// en vez de empujar el botón de cerrar.
const ENCABEZADO = "flex items-center justify-between gap-3";
const TITULO = "font-display min-w-0 font-semibold [overflow-wrap:anywhere]";
const TITULO_TAMANO = "text-[19px] max-md:text-xl";
const TITULO_VISOR = "m-0 truncate text-lg";
const CERRAR = `modal-close flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded [border:none] [background:none] text-muted
  hover:[background:var(--paper)] disabled:cursor-progress disabled:opacity-40`;
const SUBTITULO = "mb-[22px] text-[13px] text-muted max-md:mb-4";

// display: contents: no altera el layout; solo propaga "disabled" a todos
// los campos y botones. Mientras se guarda, los campos se atenúan apenas,
// para que se note que no se pueden tocar sin que parezca un error.
// El cursor de "trabajando" sobre esos campos sigue en Modal.css: varias
// etiquetas de las pantallas fijan cursor: pointer en reglas sin capa.
const CUERPO = `modal-cuerpo contents
  [&:disabled_:is(input,select,textarea,.dropzone,.co-choice,.igv-choice,.foto-equipo-slot)]:opacity-70`;

// `ocupado`: hay una operación en curso (guardando, subiendo un
// archivo...). Mientras dure, el modal no se puede cerrar por accidente
// (Escape, clic afuera, ✕, Cancelar) y todos sus campos quedan
// deshabilitados; quien lo usa lo cierra solo si la operación salió bien.
export function Modal({ open, title, subtitle, onClose, children, wide, variant, ocupado = false }) {
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
  // El scroll de la página de atrás queda bloqueado mientras el modal
  // está abierto (con la rueda del mouse o con el dedo).
  useBloquearScroll(open);
  const ocupadoRef = useRef(ocupado);
  useEffect(() => {
    ocupadoRef.current = ocupado;
  }, [ocupado]);
  const cerrar = () => {
    if (!ocupadoRef.current) onClose?.();
  };

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

    function elementosFocalizables() {
      if (!dialogRef.current) return [];
      return Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    }

    function onKeyDown(e) {
      // Con un modal abierto encima de otro (ej. el visor de archivos
      // dentro de "Documentos"), solo responde el de más arriba — si
      // no, Escape cerraría los dos a la vez.
      // Incluye los diálogos de confirmación (role="alertdialog").
      const dialogos = document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]');
      if (dialogos[dialogos.length - 1] !== dialogRef.current) return;

      if (e.key === "Escape") {
        if (!ocupadoRef.current) onCloseRef.current?.();
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
      disparador?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  const esSeguridad = variant === "seguridad";
  const esVisor = variant === "visor";
  return (
    <div className={`${FONDO} ${esVisor ? FONDO_VISOR : FONDO_COLOR} ${esSeguridad ? FONDO_SEGURIDAD : ""}`} onClick={cerrar}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-busy={ocupado || undefined}
        tabIndex={-1}
        className={`${CAJA} ${esVisor ? CAJA_VISOR : `${CAJA_FORMULARIO} ${wide ? ANCHO_WIDE : ANCHO} ${esSeguridad ? CAJA_SEGURIDAD : CAJA_MOVIL}`} ${variant ? `modal--${variant}` : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${ENCABEZADO} ${esVisor ? "mb-3" : "mb-1"}`}>
          <h2 id={tituloId} className={`${TITULO} ${esVisor ? TITULO_VISOR : TITULO_TAMANO} ${esSeguridad ? "tracking-[-0.01em]" : ""}`}>{title}</h2>
          {/* Un modal sin onClose (ej. cambio de contraseña obligatorio) no se puede cerrar: sin botón */}
          {onClose && (
            <button className={CERRAR} onClick={cerrar} type="button" aria-label="Cerrar" disabled={ocupado}>
              <IconClose width={16} height={16} />
            </button>
          )}
        </div>
        {subtitle && <p className={SUBTITULO}>{subtitle}</p>}
        {/* Propaga "disabled" a todos los campos y botones (Cancelar incluido). */}
        <fieldset className={CUERPO} disabled={ocupado}>
          {children}
        </fieldset>
      </div>
    </div>
  );
}

export function ModalActions({ onCancel, cancelLabel = "Cancelar", children }) {
  return (
    <div className={ACCIONES}>
      <button className={BOTON_SECUNDARIO} type="button" onClick={onCancel}>
        {cancelLabel}
      </button>
      {children}
    </div>
  );
}

// Selector visual "CorevexSAC / ElectroSAC" reutilizado en todos los
// formularios que registran algo con empresa.
// `opciones`: limita a ciertas empresas (ej. solo donde el trabajador
// tiene contrato). Por defecto, las dos.
// "co-choice" queda como gancho: responsive.css (44px táctiles) y los campos
// atenuados mientras se guarda (CUERPO). [&&]:flex le gana al display: block
// que CAMPO le da a toda etiqueta del campo.
const EMPRESAS = "co-choice flex gap-2.5";
const EMPRESA = "[&&]:flex flex-1 cursor-pointer items-center gap-2 rounded border-[1.5px] border-solid px-3 py-2.5 text-[13px] font-medium";
const EMPRESA_NORMAL = "border-border text-muted";
const EMPRESA_ELEGIDA = {
  corevex: "border-accion [background:var(--accion-tint)] text-accion-dark",
  electro: "border-electro [background:var(--electro-tint)] text-electro-dark",
};

export function CompanyChoice({ value, onChange, name, opciones = ["corevex", "electro"] }) {
  return (
    <div className={EMPRESAS}>
      {opciones.includes("corevex") && (
      <label className={`${EMPRESA} ${value === "corevex" ? EMPRESA_ELEGIDA.corevex : EMPRESA_NORMAL}`}>
        <input
          className="h-auto w-auto"
          type="radio"
          name={name}
          checked={value === "corevex"}
          onChange={() => onChange("corevex")}
        />
        CorevexSAC
      </label>
      )}
      {opciones.includes("electro") && (
      <label className={`${EMPRESA} ${value === "electro" ? EMPRESA_ELEGIDA.electro : EMPRESA_NORMAL}`}>
        <input
          className="h-auto w-auto"
          type="radio"
          name={name}
          checked={value === "electro"}
          onChange={() => onChange("electro")}
        />
        ElectroSAC
      </label>
      )}
    </div>
  );
}

// Campo "días de anticipación" destacado en amarillo/voltio — el mismo
// patrón en Contratos, Cursos, Equipos, Vehículos y Facturas: todo lo
// que tiene fecha de vencimiento pide cuántos días antes avisar.
export function AvisoVencimiento({ value, onChange, hint }) {
  const inputId = useId();
  return (
    <div className={`${AVISO} ${AVISO_RELLENO}`}>
      <label className={AVISO_ETIQUETA} htmlFor={inputId}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        Aviso de vencimiento
      </label>
      <div className={AVISO_FILA}>
        <input
          className={AVISO_INPUT}
          id={inputId}
          type="number"
          min={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className={AVISO_TEXTO}>{hint || "días antes del vencimiento"}</span>
      </div>
    </div>
  );
}

// Cálculo en vivo debajo del monto (total con IGV, detracción).
const RESULTADO = "mx-0 mt-1.5 mb-0 text-[12.5px] text-muted [&_b]:text-text";

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
      <fieldset className={CAMPO}>
        <legend>IGV</legend>
        <div className={OPCIONES}>
          <label className={`${OPCION} ${igvIncluido ? OPCION_ELEGIDA : OPCION_NORMAL}`}>
            <input
              className={OPCION_RADIO}
              type="radio"
              name="igvIncluido"
              checked={igvIncluido}
              onChange={() => onChange({ montoBase, igvIncluido: true })}
            />
            El monto ya incluye IGV
          </label>
          <label className={`${OPCION} ${!igvIncluido ? OPCION_ELEGIDA : OPCION_NORMAL}`}>
            <input
              className={OPCION_RADIO}
              type="radio"
              name="igvIncluido"
              checked={!igvIncluido}
              onChange={() => onChange({ montoBase, igvIncluido: false })}
            />
            Agregar IGV (18%)
          </label>
        </div>
      </fieldset>

      <div className={CAMPO}>
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
          <p className={RESULTADO}>
            Total con IGV: <b>S/ {totalConIgv.toFixed(2)}</b>
          </p>
        )}
      </div>
    </>
  );
}

// Historial tipo línea de tiempo — reutilizado en "Hoja de vida" de
// equipos/vehículos y en historiales de pago (Finanzas).
// Miniaturas que se amplían con `onVerFoto` (quien la usa muestra el
// Lightbox, con la foto original). Se cargan recién al verse, en su versión
// chica (urlMiniatura). Las usan la hoja de vida del
// equipo y la pestaña Asignaciones.
export function MiniaturasFotos({ titulo, fotos, onVerFoto }) {
  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted">{titulo}</span>
      <div className="flex flex-wrap gap-1.5">
        {fotos.map((url, i) => (
          <button key={url} type="button" className="h-12 w-16 cursor-zoom-in overflow-hidden rounded-[6px] border border-border [background:var(--paper)] p-0" onClick={() => onVerFoto(url)} aria-label={`${titulo}: ampliar foto ${i + 1}`}>
            <img className="block h-full w-full object-cover" src={urlMiniatura(url)} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </div>
  );
}

// Punto de cada evento sobre la línea; el color del borde depende del tono.
const PUNTO = "absolute top-0.5 left-[-22px] h-3 w-3 rounded-[50%] border-2 border-solid [background:var(--card)]";
const PUNTO_TONO = { success: "border-success", volt: "border-volt-dark" };

export function Timeline({ items, onVerFoto }) {
  if (!items || items.length === 0) {
    return <p className={MENSAJE_VACIO}>Aún no hay historial.</p>;
  }
  return (
    <div className="relative pl-[22px] before:absolute before:top-1 before:bottom-1 before:left-[6px] before:w-[1.5px] before:[background:var(--border)]">
      {items.map((item, i) => (
        <div className="relative flex gap-2.5 pb-5 last:pb-0" key={`${item.fecha}-${item.titulo}-${i}`}>
          <div className={`${PUNTO} ${PUNTO_TONO[item.tone] || "border-accion"}`} />
          <div className="tl-body">
            <div className="text-[13.5px] font-medium">{item.titulo}</div>
            <div className="mt-0.5 text-[12px] text-muted">
              {item.fecha}
              {item.actor ? ` — ${item.actor}` : ""}
            </div>
            {/* Comentario de "Enviado a mantenimiento" (y de cada actualización). */}
            {item.comentario && <p className="mt-1 mb-0 whitespace-pre-line text-[12.5px] text-text wrap-anywhere">«{item.comentario}»</p>}
            {item.comentarioAnterior && <p className="mt-0.5 mb-0 whitespace-pre-line text-[12px] text-muted wrap-anywhere">Antes: «{item.comentarioAnterior}»</p>}
            {onVerFoto && item.fotos?.length > 0 && <MiniaturasFotos titulo="Fotos" fotos={item.fotos} onVerFoto={onVerFoto} />}
            {onVerFoto && item.fotosReemplazadas?.length > 0 && (
              <MiniaturasFotos titulo={item.fotosReemplazadas.length === 1 ? "Foto reemplazada" : "Fotos reemplazadas"} fotos={item.fotosReemplazadas} onVerFoto={onVerFoto} />
            )}
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
      <div className={CAMPO}>
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
          <p className={RESULTADO}>
            Detracción ({formatPorcentaje(seleccionado.porcentaje)}) sobre S/ {total.toFixed(2)}: <b>S/ {montoDetraccion.toFixed(2)}</b>
            {" · "}Neto a depositar: <b>S/ {(total - montoDetraccion).toFixed(2)}</b>
          </p>
        )}
      </div>

      {seleccionado && (
        <div className={FILA}>
          <div className={CAMPO}>
            <label>
              Medio de pago (opcional)
              <input
                value={detraccionMedioPago || ""}
                onChange={(e) => onChange({ catalogoDetraccionId, detraccionMedioPago: e.target.value, detraccionCuentaBn })}
                placeholder="Ej. Depósito en cuenta"
              />
            </label>
          </div>
          <div className={CAMPO}>
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
