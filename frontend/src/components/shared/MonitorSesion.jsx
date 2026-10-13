import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useInactividad } from "../../hooks/useInactividad";
import AvisoInactividad from "./AvisoInactividad";

/**
 * Vigila la sesión en todas las pantallas con sesión iniciada: avisa
 * 2 minutos antes del cierre por inactividad y cierra al vencer (por
 * inactividad o por la duración máxima). Una sola instancia, en App.
 */
export default function MonitorSesion() {
  const { estaAutenticado, cerrarSesion } = useAuth();
  const { mostrarToast } = useToast();

  const { segundosRestantes, seguirConectado } = useInactividad({
    activo: estaAutenticado,
    onExpirar: (motivo) => cerrarSesion(motivo),
    onCercaDelMaximo: () =>
      mostrarToast("Tu sesión llegará a su duración máxima en 5 minutos. Guarda lo que estés haciendo.", {
        tipo: "info",
        duracionMs: 15000,
      }),
  });

  if (!estaAutenticado || segundosRestantes === null) return null;
  return <AvisoInactividad segundosRestantes={segundosRestantes} onSeguirConectado={seguirConectado} />;
}
