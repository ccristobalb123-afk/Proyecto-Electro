import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { BotonCarga, Spinner } from "./Carga";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import * as authService from "../../services/authService";
import "./SesionesModal.css";

function haceCuanto(fecha) {
  const minutos = Math.round((Date.now() - new Date(fecha).getTime()) / 60_000);
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return horas < 24 ? `hace ${horas} h` : new Date(fecha).toLocaleDateString("es-PE");
}

const fechaHora = (fecha) =>
  new Date(fecha).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/**
 * "Sesiones y dispositivos": dónde está abierta la cuenta, con la opción
 * de cerrar cada uno o todos (por ejemplo si se perdió el celular).
 */
export default function SesionesModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Sesiones y dispositivos" subtitle="Dónde está abierta tu cuenta ahora mismo.">
      {/* Se monta al abrir: cada apertura empieza vacía y pide la lista de nuevo. */}
      {open && <ListaSesiones onClose={onClose} />}
    </Modal>
  );
}

function ListaSesiones({ onClose }) {
  const { cerrarSesion, sesionCerradaEnServidor } = useAuth();
  const { mostrarToast } = useToast();
  const { confirmar } = useConfirm();
  const [sesiones, setSesiones] = useState(null);
  const [error, setError] = useState("");
  const [cerrandoId, setCerrandoId] = useState(null);

  useEffect(() => {
    let cancelado = false;
    authService
      .listarSesiones()
      .then((lista) => !cancelado && setSesiones(lista))
      .catch((err) => !cancelado && setError(err.message || "No se pudo cargar la lista."));
    return () => {
      cancelado = true;
    };
  }, []);

  async function cerrarUna(s) {
    if (s.esActual) {
      onClose();
      await cerrarSesion("usuario");
      return;
    }
    setCerrandoId(s.id);
    try {
      await authService.cerrarSesionDispositivo(s.id);
      setSesiones((prev) => prev.filter((x) => x.id !== s.id));
      mostrarToast(`Se cerró la sesión en ${s.dispositivo}.`, { tipo: "success" });
    } catch (err) {
      setError(err.message || "No se pudo cerrar esa sesión.");
    } finally {
      setCerrandoId(null);
    }
  }

  async function cerrarTodas() {
    const ok = await confirmar({
      titulo: "¿Cerrar sesión en todos los dispositivos?",
      mensaje:
        "Se cerrará tu sesión en todos lados, incluido este dispositivo, y dejarán de llegar notificaciones a los demás. Tendrás que volver a iniciar sesión.",
      tipo: "peligro",
      textoConfirmar: "Cerrar en todos",
      textoCargando: "Cerrando…",
      accion: () => authService.cerrarSesionEnTodos(),
    });
    if (ok) {
      onClose();
      sesionCerradaEnServidor();
    }
  }

  return (
    <>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {!sesiones && !error && (
        <div className="sesiones-cargando" role="status">
          <Spinner tamano={18} /> Cargando…
        </div>
      )}
      {sesiones && (
        <ul className="sesiones-lista">
          {sesiones.map((s) => (
            <li key={s.id} className="sesion-item">
              <div className="sesion-info">
                <div className="sesion-dispositivo">
                  {s.dispositivo}
                  {s.esActual && <span className="sesion-actual">Este dispositivo</span>}
                </div>
                <div className="sesion-detalle">
                  Última actividad: {haceCuanto(s.ultimaActividadEn)} · Inició: {fechaHora(s.iniciadaEn)}
                  {s.ip ? ` · IP ${s.ip}` : ""}
                </div>
              </div>
              <BotonCarga
                className="btn-outline-sm"
                cargando={cerrandoId === s.id}
                textoCargando="Cerrando…"
                onClick={() => cerrarUna(s)}
                aria-label={s.esActual ? "Cerrar sesión en este dispositivo" : `Cerrar sesión en ${s.dispositivo}`}
              >
                Cerrar sesión
              </BotonCarga>
            </li>
          ))}
        </ul>
      )}
      <div className="modal-actions sesiones-acciones">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Listo
        </button>
        <button type="button" className="btn-danger" onClick={cerrarTodas} disabled={!sesiones}>
          Cerrar sesión en todos los dispositivos
        </button>
      </div>
    </>
  );
}
