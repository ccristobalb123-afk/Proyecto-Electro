import "./PasswordStrength.css";

/**
 * Calcula qué tan fuerte es una contraseña, sumando puntos por:
 * longitud, mayúsculas, minúsculas, números y caracteres especiales.
 */
export function calcularFortaleza(password) {
  if (!password) return { nivel: 0, etiqueta: "", color: "" };

  let puntos = 0;
  if (password.length >= 8) puntos++;
  if (password.length >= 12) puntos++;
  if (/[a-z]/.test(password)) puntos++;
  if (/[A-Z]/.test(password)) puntos++;
  if (/[0-9]/.test(password)) puntos++;
  if (/[^a-zA-Z0-9]/.test(password)) puntos++;

  if (puntos <= 2) return { nivel: 1, etiqueta: "Baja", color: "baja" };
  if (puntos <= 4) return { nivel: 2, etiqueta: "Media", color: "media" };
  return { nivel: 3, etiqueta: "Alta", color: "alta" };
}

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const { nivel, etiqueta, color } = calcularFortaleza(password);

  return (
    <div className="password-strength">
      <div className="password-strength__barras">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`password-strength__barra ${
              i <= nivel ? `password-strength__barra--${color}` : "password-strength__barra--inactiva"
            }`}
          />
        ))}
      </div>
      <span className={`password-strength__etiqueta password-strength__etiqueta--${color}`}>
        Seguridad: <strong>{etiqueta}</strong>
      </span>
    </div>
  );
}
