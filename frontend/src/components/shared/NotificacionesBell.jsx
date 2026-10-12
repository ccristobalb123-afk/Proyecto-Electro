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
import EtiquetaUrgencia from "./EtiquetaUrgencia";
import { useAsyncList } from "../../hooks/useAsyncList";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import "./NotificacionesBell.css";

function iconoDe(tipo) {
  if (tipo === "equipo") return IconWrench;
  if (tipo === "vehiculo") return IconTruck;
  if (tipo === "contrato") return IconContrato;
  if (tipo === "factura" || tipo === "facturaPagar") return IconInvoice;
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
    // Lleva al registro: ej. /operaciones?tab=vehiculos&q=ABC-123
    navigate(n.url || "/dashboard");
  }

  return (
    <div className="notificaciones-bell" ref={wrapRef}>
      <button
        className="notificaciones-bell__boton"
        onClick={() => setAbierto((v) => !v)}
        aria-label={notificaciones.length > 0 ? `Notificaciones: ${notificaciones.length} vencimientos por atender` : "Notificaciones"}
        aria-expanded={abierto}
      >
        <IconBell width={19} height={19} />
        {notificaciones.length > 0 && (
          <span className="notificaciones-bell__badge" aria-hidden="true">{notificaciones.length > 99 ? "99+" : notificaciones.length}</span>
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
            <p className="notificaciones-bell__vacio">Sin documentos por vencer.</p>
          ) : (
            <div className="notificaciones-bell__lista">
              {notificaciones.map((n) => {
                const Icono = iconoDe(n.tipo);
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`notificacion-item notificacion-item--${n.severidad}`}
                    onClick={() => irA(n)}
                  >
                    <div className="notificacion-item__icono-wrapper">
                      <Icono width={15} height={15} />
                    </div>
                    <div className="notificacion-item__texto">
                      <p className="notificacion-item__titulo">
                        <span>{n.titulo}</span>
                        <EtiquetaUrgencia aviso={n} />
                      </p>
                      <p className="notificacion-item__detalle">{n.cuerpo}</p>
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
