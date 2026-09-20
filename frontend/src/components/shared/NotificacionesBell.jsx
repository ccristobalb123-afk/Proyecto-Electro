import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconBell,
  IconClose,
  IconContrato,
  IconWrench,
  IconTruck,
  IconClipboardCheck,
  IconInvoice,
} from "../icons/Icons";
import * as notificacionesService from "../../services/notificacionesService";
import { useAsyncList } from "../../hooks/useAsyncList";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import "./NotificacionesBell.css";

const RUTA_POR_TIPO = {
  curso: "/rrhh",
  contrato: "/rrhh",
  equipo: "/operaciones",
  vehiculo: "/operaciones",
  factura: "/finanzas",
};

function iconoDe(tipo) {
  if (tipo === "equipo") return IconWrench;
  if (tipo === "vehiculo") return IconTruck;
  if (tipo === "contrato") return IconContrato;
  if (tipo === "factura") return IconInvoice;
  return IconClipboardCheck;
}

export default function NotificacionesBell() {
  const [abierto, setAbierto] = useState(false);
  const { data: notificaciones } = useAsyncList(() => notificacionesService.listarAlertas(), []);
  const push = usePushNotifications();
  const navigate = useNavigate();
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickFuera(e) {
      if (!wrapRef.current?.contains(e.target)) setAbierto(false);
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  function irA(n) {
    setAbierto(false);
    navigate(RUTA_POR_TIPO[n.tipo] || "/dashboard");
  }

  return (
    <div className="notificaciones-bell" ref={wrapRef}>
      <button
        className="notificaciones-bell__boton"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Notificaciones"
      >
        <IconBell width={19} height={19} />
        {notificaciones.length > 0 && (
          <span className="notificaciones-bell__badge">{notificaciones.length}</span>
        )}
      </button>

      {abierto && (
        <div className="notificaciones-bell__panel">
          <div className="notificaciones-bell__header">
            <span>Notificaciones</span>
            <button className="notificaciones-bell__cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar">
              <IconClose width={15} height={15} />
            </button>
          </div>

          {push.soportado && push.permiso !== "denied" && (
            <button
              className="notificaciones-bell__push-toggle"
              type="button"
              onClick={() => (push.suscrito ? push.desactivar() : push.activar())}
              disabled={push.activando}
            >
              {push.activando
                ? "Activando..."
                : push.suscrito
                  ? "Desactivar notificaciones en este dispositivo"
                  : "Activar notificaciones en este dispositivo"}
            </button>
          )}
          {push.permiso === "denied" && (
            <p className="notificaciones-bell__push-bloqueado">
              Bloqueaste las notificaciones para este sitio — actívalas desde la configuración del navegador si quieres recibirlas.
            </p>
          )}

          {notificaciones.length === 0 ? (
            <p className="notificaciones-bell__vacio">No hay vencimientos próximos.</p>
          ) : (
            <div className="notificaciones-bell__lista">
              {notificaciones.map((n) => {
                const Icono = iconoDe(n.tipo);
                const vencido = n.dias < 0;
                return (
                  <button
                    key={n.id}
                    className={`notificacion-item ${vencido ? "notificacion-item--vencido" : "notificacion-item--por-vencer"}`}
                    onClick={() => irA(n)}
                  >
                    <div className="notificacion-item__icono-wrapper">
                      <Icono width={15} height={15} />
                    </div>
                    <div className="notificacion-item__texto">
                      <p className="notificacion-item__titulo">{n.titulo}</p>
                      <p className="notificacion-item__detalle">
                        <span className="co-pill">{n.empresa}</span>{" "}
                        {vencido ? `Venció hace ${Math.abs(n.dias)} día(s)` : `Vence en ${n.dias} día(s)`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
