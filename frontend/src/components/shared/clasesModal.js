/**
 * Clases de Tailwind del modal compartido que también usan otros
 * componentes (formularios de cada pantalla, visor, sesiones…). Van en un
 * archivo aparte porque Modal.jsx solo debe exportar componentes (Fast
 * Refresh).
 *
 * Clases que quedan como gancho de otras reglas (no dan estilo por sí
 * solas): modal-actions (Rrhh.css).
 */

// Pie con las acciones. En celular (y en celular horizontal, apaisado:) la
// barra queda pegada al borde inferior mientras el formulario hace scroll:
// "Guardar" siempre está a la vista. sticky respeta el padding del
// contenedor que hace scroll: con bottom: 0 la barra quedaba flotando
// arriba del borde, por eso el bottom y los márgenes negativos son iguales
// al padding del modal en cada caso. En celular, además, los botones van del
// mismo tamaño y repartidos a lo ancho.
const ACCIONES_FILA = `modal-actions flex flex-wrap justify-end gap-2.5
  max-md:[&>:is(button,a)]:min-h-(--control-height-lg) max-md:[&>:is(button,a)]:[flex:1_1_auto] max-md:[&>:is(button,a)]:justify-center`;
const BARRA_APAISADO = `apaisado:sticky apaisado:bottom-[-18px] apaisado:z-1 apaisado:-mx-6 apaisado:mb-[-18px]
  apaisado:border-t apaisado:border-t-border apaisado:[background:var(--card)] apaisado:px-6 apaisado:py-3`;
export const ACCIONES = `${ACCIONES_FILA} ${BARRA_APAISADO} apaisado:mt-2
  max-md:sticky max-md:-bottom-5 max-md:z-1 max-md:-mx-4 max-md:mt-2 max-md:-mb-5
  max-md:border-t max-md:border-t-border max-md:[background:var(--card)] max-md:px-4 max-md:pt-3 max-md:pb-4`;

// Pie del visor de archivos: el visor no hace scroll (la imagen se ajusta
// sola), así que en celular no lleva la barra fija; en celular horizontal sí
// (como antes). Los dos enlaces se reparten el ancho en partes iguales:
// [&&>a] le gana a la regla de los hijos de ACCIONES_FILA. bottom, z-index y
// background:none en celular no se ven (el pie no es sticky ahí), pero son
// los valores que tenía: se copian para que el estilo calculado sea igual.
export const ACCIONES_VISOR = `${ACCIONES_FILA} ${BARRA_APAISADO} mt-3 shrink-0 max-md:[&&>a]:[flex:1_1_0]
  max-md:-bottom-5 max-md:z-1 max-md:[background:none]`;

// Botón secundario ("Cancelar", "Descargar"). "btn-secondary" queda como
// gancho: responsive.css (44px táctiles).
export const BOTON_SECUNDARIO = `btn-secondary rounded border border-border [background:var(--card)] px-[18px] py-2.5 text-[13.5px] font-semibold text-muted
  disabled:cursor-not-allowed disabled:opacity-55`;

// Texto de lista vacía o de carga dentro de un modal ("Aún no hay historial").
export const MENSAJE_VACIO = "py-5 text-[13px] text-muted";

// ---------- Campos de formulario ----------
// CAMPO va en cada <div> o <fieldset> de campo. Estiliza su <legend>, sus
// <label> y sus controles con selectores de descendiente ([&_label]:…), con
// la misma especificidad que tenían en Modal.css (.form-field label, 0-1-1;
// .form-field input:not(…), 0-3-1): así siguen ganándole a las clases
// propias de cada etiqueta o campo, igual que antes. Un elemento de adentro
// que tiene que ganarle (la etiqueta de una opción, por ejemplo) sube su
// especificidad con [&&]: (ver docs/tailwind.md).
// "form-field" queda como gancho: responsive.css (.form-field > .link-button),
// Operaciones.css, Administracion.css y la regla bloqueada de Modal.css.
export const CAMPO = `form-field mb-4
  [fieldset&]:min-w-0 [fieldset&]:[border:none] [fieldset&]:p-0
  [&_legend]:mb-1.5 [&_legend]:block [&_legend]:p-0 [&_legend]:text-[13px] [&_legend]:font-medium
  [&_label]:mb-1.5 [&_label]:block [&_label]:text-[13px] [&_label]:font-medium
  [&_input:not([type=radio]):not([type=checkbox])]:h-(--control-height-lg) [&_input:not([type=radio]):not([type=checkbox])]:w-full
  [&_input:not([type=radio]):not([type=checkbox])]:rounded [&_input:not([type=radio]):not([type=checkbox])]:border
  [&_input:not([type=radio]):not([type=checkbox])]:border-control [&_input:not([type=radio]):not([type=checkbox])]:[background:var(--card)]
  [&_input:not([type=radio]):not([type=checkbox])]:px-3 [&_input:not([type=radio]):not([type=checkbox])]:py-0
  [&_input:not([type=radio]):not([type=checkbox])]:font-body [&_input:not([type=radio]):not([type=checkbox])]:text-[13.5px]
  [&_select]:h-(--control-height-lg) [&_select]:w-full [&_select]:rounded [&_select]:border [&_select]:border-control
  [&_select]:[background:var(--card)] [&_select]:px-3 [&_select]:py-0 [&_select]:font-body [&_select]:text-[13.5px]
  [&_textarea]:h-auto [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded [&_textarea]:border [&_textarea]:border-control
  [&_textarea]:[background:var(--card)] [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:font-body [&_textarea]:text-[13.5px]`;

// Dos campos lado a lado. "form-row" queda como gancho: responsive.css los
// apila en ≤560px (.modal-electro .form-row).
export const FILA = "form-row grid grid-cols-[1fr_1fr] gap-3.5";

// Título de un grupo de campos que no es un <label> (ej. "Documento del contrato").
export const TITULO_CAMPO = "mb-1.5 block text-[13px] font-medium";

// Ayuda debajo del título de un campo. "campo-ayuda" queda como gancho:
// Operaciones.css (.tipos-equipo__barra .campo-ayuda).
export const AYUDA = "campo-ayuda mx-0 -mt-1 mb-2 text-sm text-muted";

// Dato que el sistema completa solo (ej. la empresa del contrato).
export const DERIVADO = "m-0 flex flex-wrap items-center gap-2 text-base text-muted";

// Error de validación debajo de un campo o del formulario.
export const ERROR_CAMPO = "-mt-2.5 mb-4 text-[12px] text-danger-dark";

// Campo obligatorio: asterisco junto a la etiqueta, y la nota que lo explica.
export const OBLIGATORIO = "font-semibold text-danger-dark";
export const NOTA_OBLIGATORIOS = "mx-0 mt-0 mb-3 text-xs text-muted";

// Recuadro de "categoría nueva" (Nuevo gasto).
export const CAJA_CATEGORIA = "mb-4 flex flex-col gap-2.5 rounded border border-border [background:var(--paper)] px-4 py-3.5";

// "Aviso de vencimiento": días de anticipación, destacado en amarillo. El
// relleno va aparte (AVISO_RELLENO) porque en los documentos del vehículo es
// otro. "aviso-input-row" queda como gancho: responsive.css (44px táctiles).
export const AVISO = "mb-4 rounded [background:var(--volt-tint)]";
export const AVISO_RELLENO = "px-4 py-3.5";
export const AVISO_ETIQUETA = "[&&]:mb-2 [&&]:flex items-center gap-1.5 [&&]:text-[13px] [&&]:font-semibold text-volt-dark";
export const AVISO_FILA = "aviso-input-row flex items-center gap-2.5";
// [font-family:…] y no font-mono: .font-mono también existe sin capa en
// tokens.css y le ganaría a la letra de CAMPO (en los documentos del
// vehículo el aviso va dentro de un campo, y ahí la letra es la del body).
export const AVISO_INPUT = "h-[38px] w-20 rounded border border-control text-center [font-family:var(--font-mono)] text-[14px] font-semibold";
export const AVISO_TEXTO = "text-[13px] text-volt-dark";

// Zona para soltar o elegir un archivo (<label> con un <input type="file">
// oculto). Con archivo elegido: borde verde y sin hover. "dropzone" queda
// como gancho: Modal.jsx (campos atenuados mientras se guarda).
export const DROPZONE = `dropzone mb-5 cursor-pointer rounded border-[1.5px] p-[22px] text-center
  [&_svg]:mb-2 [&_svg]:text-muted-2 [&_p]:text-[13px] [&_p_b]:text-link`;
export const DROPZONE_SIN_ARCHIVO = "border-dashed border-border hover:border-copper hover:[background:var(--gray-tint)] [&_p]:text-muted";
export const DROPZONE_CON_ARCHIVO = "border-solid border-success [background:var(--success-tint)] [&_p]:text-success-dark";

// Opciones lado a lado (IGV incluido/agregar, Boleta/Factura). Con OPCIONES,
// en celular una debajo de la otra; con OPCIONES_FILA, siempre lado a lado
// (Boleta / Factura de Nuevo gasto caben aun en 360px). "igv-choice" queda
// como gancho: responsive.css (44px táctiles) y Modal.jsx (campos atenuados).
export const OPCIONES_FILA = "igv-choice flex gap-2.5";
export const OPCIONES = `${OPCIONES_FILA} max-md:flex-col`;
export const OPCION = "[&&]:flex flex-1 cursor-pointer items-center gap-2 rounded border px-3 py-2.5 text-[13px]";
export const OPCION_NORMAL = "border-border text-muted";
export const OPCION_ELEGIDA = "border-copper [background:var(--copper-tint)] text-copper-dark";
export const OPCION_RADIO = "h-auto w-auto";
