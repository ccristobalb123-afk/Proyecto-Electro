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

// Estilos con Tailwind (ver docs/tailwind.md). El nivel también va en texto
// ("Seguridad: Baja/Media/Alta"): el color nunca es la única señal.
const BARRA_ENCENDIDA = { baja: "bg-danger", media: "bg-volt", alta: "bg-success" };
const ETIQUETA = { baja: "text-danger-dark", media: "text-volt-dark", alta: "text-success-dark" };

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const { nivel, etiqueta, color } = calcularFortaleza(password);

  return (
    <div className="-mt-1.5 flex w-full flex-col gap-1.5">
      <div className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-[999px] [transition:background-color_0.25s_ease] ${
              i <= nivel ? BARRA_ENCENDIDA[color] : "bg-gray-tint"
            }`}
          />
        ))}
      </div>
      <span className={`m-0 text-xs font-medium tracking-[0.01em] ${ETIQUETA[color]}`}>
        Seguridad: <strong>{etiqueta}</strong>
      </span>
    </div>
  );
}
