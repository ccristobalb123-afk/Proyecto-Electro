import { IconHourglass } from "../icons/Icons";
import "./AvisoInactividad.css";

export default function AvisoInactividad({ segundosRestantes, onSeguirConectado }) {
  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;

  return (
    <div className="aviso-inactividad-overlay">
      <div className="aviso-inactividad-card">
        <div className="aviso-inactividad-icono-container">
          <IconHourglass className="aviso-inactividad-icono" width={30} height={30} />
        </div>
        <h2 className="font-display">¿Sigues ahí?</h2>
        <p>
          Tu sesión se cerrará por inactividad en{" "}
          <strong className="timer-destacado">
            {minutos}:{String(segundos).padStart(2, "0")}
          </strong>
        </p>
        <button className="btn-seguir-conectado" onClick={onSeguirConectado}>
          Seguir conectado
        </button>
      </div>
    </div>
  );
}
