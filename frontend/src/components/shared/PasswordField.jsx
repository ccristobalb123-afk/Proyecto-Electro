import { useState } from "react";
import { IconEye, IconEyeOff } from "../icons/Icons";

/**
 * Campo de contraseña compartido por el Login, "Restablecer contraseña" y el
 * modal de cambiar contraseña. Suma el botón de mostrar/ocultar, y deja pasar
 * `children` (ej. la barra de fortaleza) justo debajo del input.
 *
 * `autoComplete` importa para los gestores de contraseñas:
 *   "current-password" → contraseña que ya existe (login, contraseña actual)
 *   "new-password"     → contraseña que se está creando
 *
 * El `name` es obligatorio en el Login: handleCredentialsSubmit lee el valor
 * con FormData, por si el navegador autocompletó sin disparar onChange.
 *
 * Estilos con Tailwind (ver docs/tailwind.md). Funciona igual sobre la hoja
 * del Login y dentro del modal: lleva su propio aspecto completo y no depende
 * de .form-field. La clase password-field no da estilo por sí sola: es el
 * gancho del margen del campo dentro del acceso (FORM en clasesAuth.js).
 */

// pr-12: el espacio de la derecha es del botón del ojo.
const INPUT = `h-(--control-height-lg) w-full rounded border border-control bg-card py-0 pr-12 pl-3.5 font-body text-[14px] text-text
  [transition:border-color_var(--transition-fast)] aria-invalid:border-danger`;

// Responde al presionar (se achica); con movimiento reducido, sin escalar. El
// hover solo donde existe (hover: ya va en @media (hover: hover)): en táctil
// se queda "pegado" tras el toque.
const OJO = `absolute top-0 right-0 flex size-(--control-height-lg) items-center justify-center rounded
  [border:none] [background:none] text-muted hover:[background:var(--paper)] hover:text-text
  active:[transform:scale(0.94)] active:[transition:transform_100ms_var(--ease-out)] motion-reduce:active:[transform:none]`;

export default function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete = "current-password",
  autoFocus,
  required,
  placeholder,
  invalid,
  describedBy,
  children,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field mb-4">
      <label htmlFor={id} className="mb-1.5 block text-base font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          className={INPUT}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required={required}
          placeholder={placeholder}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          spellCheck={false}
          autoCapitalize="none"
        />
        <button
          type="button"
          className={OJO}
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label="Mostrar contraseña"
        >
          {visible ? <IconEyeOff width={18} height={18} /> : <IconEye width={18} height={18} />}
        </button>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
