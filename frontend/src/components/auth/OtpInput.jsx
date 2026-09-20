/**
 * Casillas del código de verificación en dos pasos (6 dígitos).
 *
 * El estado y la validación siguen viviendo en useLoginFlow: este componente
 * solo recibe `otp` (arreglo de 6), `onChange(indice, valor)` (el
 * handleOtpChange del hook, que solo acepta un dígito y salta a la siguiente
 * casilla) y `setOtp` para poder rellenar varias casillas de golpe.
 *
 * Además de teclear, cubre lo que se hace en la práctica:
 *  - Pegar el código completo (o que iOS lo autocomplete desde el SMS/app:
 *    llega como varios caracteres en la primera casilla).
 *  - Retroceso en una casilla vacía → vuelve a la anterior y la borra.
 *  - Flechas izquierda/derecha para moverse.
 * Los ids `otp-0…5` se mantienen: el hook enfoca la siguiente casilla por id.
 */
const LARGO = 6;

export default function OtpInput({ otp, onChange, setOtp, invalid, describedBy }) {
  function enfocar(indice) {
    const el = document.getElementById(`otp-${indice}`);
    el?.focus();
    el?.select();
  }

  // Rellena desde `desde` con los dígitos recibidos. Si llegan los 6 (o más),
  // siempre se llena desde la primera casilla, sin importar dónde se pegó.
  function rellenar(desde, digitos) {
    const inicio = digitos.length >= LARGO ? 0 : desde;
    const siguiente = [...otp];
    digitos.slice(0, LARGO - inicio).split("").forEach((d, k) => {
      siguiente[inicio + k] = d;
    });
    setOtp(siguiente);
    enfocar(Math.min(inicio + digitos.length, LARGO - 1));
  }

  function handleChange(indice, valor) {
    const digitos = valor.replace(/\D/g, "");
    // Teclear sobre una casilla ya llena deja dos dígitos: se queda el nuevo.
    // (No es un pegado; quitando el dígito anterior queda solo el que se tecleó.)
    if (digitos.length === 2 && otp[indice]) {
      onChange(indice, digitos.replace(otp[indice], ""));
      return;
    }
    if (digitos.length > 1) {
      rellenar(indice, digitos); // pegado o autocompletado del sistema
      return;
    }
    onChange(indice, digitos);
  }

  function handlePaste(indice, e) {
    const digitos = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!digitos) return;
    e.preventDefault();
    rellenar(indice, digitos);
  }

  function handleKeyDown(indice, e) {
    if (e.key === "Backspace" && !otp[indice] && indice > 0) {
      e.preventDefault();
      onChange(indice - 1, "");
      enfocar(indice - 1);
    } else if (e.key === "ArrowLeft" && indice > 0) {
      e.preventDefault();
      enfocar(indice - 1);
    } else if (e.key === "ArrowRight" && indice < LARGO - 1) {
      e.preventDefault();
      enfocar(indice + 1);
    }
  }

  return (
    <div className="auth-otp" role="group" aria-label="Código de verificación de 6 dígitos">
      {otp.map((digito, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          className="auth-otp__casilla"
          aria-label={`Dígito ${i + 1} del código`}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          value={digito}
          onChange={(e) => handleChange(i, e.target.value)}
          onPaste={(e) => handlePaste(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}
