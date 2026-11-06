import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { BotonCarga, Spinner } from "./Carga";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import * as authService from "../../services/authService";
import { ACCIONES, BOTON_SECUNDARIO, ERROR_CAMPO } from "./clasesModal";

// Cada sesión: dispositivo (y "Este dispositivo"), última actividad, inicio e
// IP, y su botón. En celulares angostos (≤480px) el botón baja debajo del texto
// y los botones del pie se apilan, el principal arriba.
const ITEM = `flex items-center justify-between gap-3 rounded border border-border [background:var(--card)] p-3
  max-[481px]:flex-col max-[481px]:items-stretch`;
const ACCIONES_SESIONES = "max-[481px]:flex-col-reverse max-[481px]:[&>button]:w-full";

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
        <p className={ERROR_CAMPO} role="alert">
          {error}
        </p>
      )}
      {!sesiones && !error && (
        <div className="flex items-center gap-2 px-0 py-3 text-sm text-muted" role="status">
          <Spinner tamano={18} /> Cargando…
        </div>
      )}
      {sesiones && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {sesiones.map((s) => (
            <li key={s.id} className={ITEM}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-text">
                  {s.dispositivo}
                  {s.esActual && <span className="rounded-[999px] [background:var(--success-tint)] px-2 py-px text-xs font-medium text-success-dark">Este dispositivo</span>}
                </div>
                <div className="mt-0.5 text-sm leading-[1.4] text-muted [overflow-wrap:anywhere]">
                  Última actividad: {haceCuanto(s.ultimaActividadEn)} · Inició: {fechaHora(s.iniciadaEn)}
                  {s.ip ? ` · IP ${s.ip}` : ""}
                </div>
              </div>
              <BotonCarga
                className="btn-outline-sm flex-none"
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
      <div className={`${ACCIONES} ${ACCIONES_SESIONES}`}>
        <button type="button" className={BOTON_SECUNDARIO} onClick={onClose}>
          Listo
        </button>
        <button type="button" className="btn-danger" onClick={cerrarTodas} disabled={!sesiones}>
          Cerrar sesión en todos los dispositivos
        </button>
      </div>
    </>
  );
}
