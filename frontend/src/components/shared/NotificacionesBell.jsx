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

/* Estilos con Tailwind (ver docs/tailwind.md). Las clases notificaciones-bell__*
   que quedan son ganchos de reglas sin capa de otros archivos: __boton,
   __cerrar y __push-toggle (alto táctil de 44px, responsive.css) y __panel
   (solo fundido con movimiento reducido, motion.css). La animación de
   entrada (@keyframes) sigue en NotificacionesBell.css. */
const BOTON = `notificaciones-bell__boton relative flex size-9 cursor-pointer items-center justify-center rounded-[50%] border border-border
  [background:var(--paper)] text-muted [transition:background-color_0.15s_ease,border-color_0.15s_ease,color_0.15s_ease]
  hover:border-accion hover:[background:var(--accion-tint)] hover:text-accion-dark`;
const BADGE = `absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-[999px] border-2 border-card
  [background:var(--danger)] px-1 py-0 text-xs font-bold text-on-accent`;
const PANEL = `notificaciones-bell__panel absolute top-[46px] right-0 z-(--z-bell-panel) w-[320px] max-w-[88vw] origin-top-right
  overflow-hidden rounded-lg border border-border [background:var(--card)] [box-shadow:var(--shadow-lg)]
  [animation:bell-panel-entrar_0.18s_var(--ease-out)]`;
const HEADER = `flex items-center justify-between border-b border-b-border px-4 py-3 font-display text-[15px] font-bold text-text`;
const CERRAR = `notificaciones-bell__cerrar flex cursor-pointer rounded-[4px] [background:none] p-1 text-muted [border:none]
  hover:[background:var(--paper)] hover:text-text`;
// Bordes por lado (no "border: none" + "border-bottom"): así no hay dos
// clases que toquen la misma propiedad.
const SOLO_LINEA_ABAJO = "[border-top:none] [border-right:none] [border-bottom:1px_solid_var(--border)] [border-left:none]";
const PUSH = `notificaciones-bell__push-toggle block w-full [background:var(--accion-tint)] px-4 py-2.5 text-left text-[12.5px]
  font-semibold text-accion ${SOLO_LINEA_ABAJO} disabled:opacity-60`;
const ITEM = `flex w-full cursor-pointer gap-3 [background:transparent] px-4 py-3 text-left [color:inherit] [font:inherit]
  ${SOLO_LINEA_ABAJO} [transition:background_0.12s_ease] last:[border-bottom:none] hover:[background:var(--paper)]`;
const ICONO_POR_SEVERIDAD = { vencido: "text-danger-dark", hoy: "text-danger-dark", porvencer: "text-volt-dark" };

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
    <div className="relative" ref={wrapRef}>
      <button
        className={BOTON}
        onClick={() => setAbierto((v) => !v)}
        aria-label={notificaciones.length > 0 ? `Notificaciones: ${notificaciones.length} vencimientos por atender` : "Notificaciones"}
        aria-expanded={abierto}
      >
        <IconBell width={19} height={19} />
        {notificaciones.length > 0 && (
          <span className={BADGE} aria-hidden="true">{notificaciones.length > 99 ? "99+" : notificaciones.length}</span>
        )}
      </button>

      {abierto && (
        <div className={PANEL}>
          <div className={HEADER}>
            <span>Notificaciones</span>
            <button className={CERRAR} onClick={() => setAbierto(false)} aria-label="Cerrar">
              <IconClose width={15} height={15} />
            </button>
          </div>

          {push.soportado && push.permiso !== "denied" && (
            <button
              className={PUSH}
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
            <p className="m-0 border-b border-b-border px-4 py-2.5 text-[12px] text-muted">
              Bloqueaste las notificaciones para este sitio — actívalas desde la configuración del navegador si quieres recibirlas.
            </p>
          )}

          {notificaciones.length === 0 ? (
            <p className="m-0 px-4 py-8 text-center text-[13px] text-muted">Sin documentos por vencer.</p>
          ) : (
            <div className="flex max-h-[min(60vh,420px)] flex-col overflow-y-auto overscroll-contain">
              {notificaciones.map((n) => {
                const Icono = iconoDe(n.tipo);
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={ITEM}
                    onClick={() => irA(n)}
                  >
                    <div className={`mt-px shrink-0 ${ICONO_POR_SEVERIDAD[n.severidad] || "text-muted"}`}>
                      <Icono width={15} height={15} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      {/* Si al título le quedarían menos de ~8em al lado de la
                          etiqueta (celular), la etiqueta pasa a la línea de abajo. */}
                      <p className="m-0 mb-[3px] flex flex-wrap items-start justify-between gap-2 text-[13px] leading-[1.3] font-semibold text-text">
                        <span className="min-w-0 [flex:1_1_8em] [overflow-wrap:anywhere]">{n.titulo}</span>
                        <EtiquetaUrgencia aviso={n} />
                      </p>
                      {/* El cuerpo es el mismo texto del push; la urgencia la lleva la etiqueta. */}
                      <p className="m-0 text-[12px] leading-[1.4] text-muted [overflow-wrap:anywhere]">{n.cuerpo}</p>
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
