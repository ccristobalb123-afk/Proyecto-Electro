import { useState } from "react";
import { IconEye, IconEyeOff } from "../icons/Icons";
import "./PasswordField.css";

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
 */
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
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field__control">
        <input
          id={id}
          name={name}
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
          className="password-field__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? <IconEyeOff width={18} height={18} /> : <IconEye width={18} height={18} />}
        </button>
      </div>
      {children && <div className="password-field__extra">{children}</div>}
    </div>
  );
}
