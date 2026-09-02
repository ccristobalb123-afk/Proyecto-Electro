import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconBell,
  IconClose,
  IconContrato,
  IconWrench,
  IconTruck,
  IconClipboardCheck,
} from "../icons/Icons";
import * as notificacionesService from "../../services/notificacionesService";
import { useAsyncList } from "../../hooks/useAsyncList";
import "./NotificacionesBell.css";

const RUTA_POR_TIPO = {
  curso: "/rrhh",
  contrato: "/rrhh",
  equipo: "/operaciones",
  vehiculo: "/operaciones",
  factura: "/finanzas",
};

function diasParaVencer(fechaISO) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaISO + "T00:00:00");
  return Math.round((venc - hoy) / (1000 * 60 * 60 * 24));
}

function formatFecha(fechaISO) {
  const [y, m, d] = fechaISO.split("-");
  return `${d}/${m}/${y}`;
}

function iconoDe(tipo) {
  if (tipo === "equipo") return IconWrench;
  if (tipo === "vehiculo") return IconTruck;
  if (tipo === "contrato") return IconContrato;
  return IconClipboardCheck;
}

export default function NotificacionesBell() {
  const [abierto, setAbierto] = useState(false);
  const { data: notificaciones } = useAsyncList(() => notificacionesService.listarAlertas(), []);
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
                        {vencido
                          ? `Venció el ${formatFecha(n.fechaVencimiento)} (hace ${Math.abs(n.dias)} días)`
                          : `Vence el ${formatFecha(n.fechaVencimiento)} (en ${n.dias} días)`}
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
