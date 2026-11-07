/**
 * Chip de documento ("Ver PDF", "Adjuntar", "Subiendo…"): RRHH, el visor
 * (BotonVerArchivo por defecto) y el formulario de documentos del vehículo.
 * Antes eran .doc-chip y sus variantes, copiadas en Rrhh.css y
 * Operaciones.css (sin capa), más dos reglas de Modal.css para el formulario
 * del vehículo.
 *
 * "doc-chip" queda como gancho: responsive.css (44px táctiles) y el
 * contenedor del formulario del vehículo ([&_.doc-chip]:max-w-full).
 *
 * Cada variante trae su fondo, color, borde y hover (no se suman dos clases
 * de la misma propiedad). Al pasar el cursor, el fondo es la mezcla con cobre
 * en todas salvo "pendiente" (mezcla con rojo) y el "opcional" de RRHH
 * (cobre claro), como antes.
 *
 * Dentro de un campo de formulario (CAMPO), la etiqueta general del campo le
 * gana en display y letra (bloque, 13px): igual que antes con la regla
 * bloqueada de Modal.css (.form-field label.doc-chip).
 */
const FORMA = "doc-chip inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-[5px] text-[12.5px] font-medium no-underline";
const HOVER_COBRE = "hover:[background:color-mix(in_srgb,var(--copper-tint),var(--copper)_12%)]";

export const CHIP_DOC = `${FORMA} [border:none] [background:var(--copper-tint)] text-copper-dark ${HOVER_COBRE}`;
export const CHIP_DOC_SUBIENDO = `${FORMA} cursor-progress [border:none] [background:var(--gray-tint)] text-muted tabular-nums ${HOVER_COBRE}`;
export const CHIP_DOC_PENDIENTE = `${FORMA} cursor-pointer [border:1px_dashed_var(--danger-dark)] [background:var(--danger-tint)] text-danger-dark
  hover:[background:color-mix(in_srgb,var(--danger-tint),var(--danger)_12%)]`;
// Adjuntar opcional: neutro y punteado, no en rojo como un faltante.
const OPCIONAL = `${FORMA} cursor-pointer [border:1px_dashed_var(--border-control)] [background:var(--card)] text-gray-dark`;
export const CHIP_DOC_OPCIONAL = `${OPCIONAL} hover:[background:var(--copper-tint)]`; // Cursos / EMO
export const CHIP_DOC_OPCIONAL_VEHICULO = `${OPCIONAL} ${HOVER_COBRE}`; // documentos del vehículo

// En un <button> (BotonVerArchivo) la letra, el fondo, el borde, el relleno y
// el color suben su especificidad con [&&]: para ganarle a las clases propias
// del botón ([font:inherit], [background:none], p-0…).
export const CHIP_DOC_BOTON = `doc-chip inline-flex items-center gap-1.5 rounded-[6px] [&&]:px-2.5 [&&]:py-[5px] [&&]:text-[12.5px] [&&]:font-medium no-underline
  [&&]:[border:none] [&&]:[background:var(--copper-tint)] [&&]:text-copper-dark [&&]:hover:[background:color-mix(in_srgb,var(--copper-tint),var(--copper)_12%)]`;
