import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import GlobalSearch from "./GlobalSearch";
import {
  IconDashboard,
  IconRrhh,
  IconOperaciones,
  IconFinanzas,
  IconAdministracion,
  IconMenu,
  IconClose,
  IconLock,
  IconDevices,
} from "../icons/Icons";
import NotificacionesBell from "../shared/NotificacionesBell";
import CambiarPasswordModal from "../shared/CambiarPasswordModal";
import SesionesModal from "../shared/SesionesModal";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import "./AppShell.css";

/* Estilos con Tailwind (ver docs/tailwind.md). Las clases sin utilidades que
   quedan son ganchos de reglas sin capa de otros archivos:
   - sidebar: sin deslizamiento con movimiento reducido (motion.css);
   - sidebar-cerrar, hamburger-btn, logout-btn y los enlaces de .nav: alto
     táctil de 44px (responsive.css);
   - main: reglas de cada pantalla con ".main" delante (responsive.css,
     tarjetas.css);
   - topbar-right: el botón de acción de cada pantalla (.btn-primary, sin
     capa) se ajusta en AppShell.css.
   max-lg: = tablet y celular (≤960px), cuando el menú lateral pasa a panel
   deslizante. [background:…], [border:none]… copian la propiedad abreviada
   de antes para que el estilo calculado quede igual. */
const ALTO_PANTALLA = "h-screen supports-[height:100dvh]:h-dvh";
const SIDEBAR = `sidebar [flex:0_0_var(--sidebar-width)] [background:var(--ink)] text-on-ink flex flex-col sticky top-0 ${ALTO_PANTALLA}
  overflow-y-auto overscroll-contain
  max-lg:fixed max-lg:[inset:0_auto_0_0] max-lg:z-(--z-drawer) max-lg:w-[min(var(--sidebar-width),82vw)]
  max-lg:[transition:transform_0.22s_ease] max-lg:pl-[env(safe-area-inset-left)]`;
// Cerrado / abierto (en tablet y celular); separados para no repetir la
// misma propiedad dos veces en un elemento.
const SIDEBAR_CERRADO = "max-lg:[transform:translateX(-100%)] max-lg:[box-shadow:0_0_0_rgba(0,0,0,0)]";
const SIDEBAR_ABIERTO = "max-lg:[transform:translateX(0)] max-lg:[box-shadow:20px_0_40px_rgba(0,0,0,0.25)]";
const OVERLAY = `hidden max-lg:fixed max-lg:inset-0 max-lg:block max-lg:z-(--z-drawer-overlay)
  max-lg:[background:color-mix(in_srgb,var(--ink-2)_50%,transparent)]`;
const BOTON_ICONO_BARRA = "[background:none] [border:none] rounded cursor-pointer";
const NAV_LINK = `flex items-center gap-3 rounded px-3 py-2.5 text-[14px] font-medium [border-left:3px_solid_transparent]
  [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:flex-none`;
// Activo: azul vivo (--nav-activo) con las esquinas de los controles. El
// borde izquierdo queda transparente pero se conserva: sus 3px sostienen la
// posición del texto.
const NAV_ACTIVO = "[background:var(--nav-activo)] text-on-accent";
const NAV_INACTIVO = "text-on-ink-soft hover:[background:color-mix(in_srgb,var(--on-ink)_8%,transparent)] hover:text-on-ink";
const LOGOUT = `logout-btn ${BOTON_ICONO_BARRA} flex flex-none items-center justify-center p-1.5 text-on-ink-muted
  hover:[background:rgba(255,255,255,0.06)] hover:text-on-ink`;
// El topbar queda quieto arriba; solo .main hace scroll, así que la barra
// con el título y las acciones nunca se mueve ni se tapa. En tablet y
// celular suma el alto del notch (viewport-fit=cover: en un iPhone sin
// barra del navegador quedaba debajo; en Safari normal env() vale 0).
const TOPBAR = `sticky top-0 z-10 flex h-(--topbar-height) flex-none items-center justify-between gap-3 border-b border-b-border
  [background:var(--card)] px-7 py-0
  max-lg:h-[calc(var(--topbar-height)+env(safe-area-inset-top))]
  max-lg:[padding:env(safe-area-inset-top)_max(16px,env(safe-area-inset-right))_0_max(16px,env(safe-area-inset-left))]`;
const MAIN = `main min-h-0 flex-1 overflow-y-auto p-7
  max-lg:[padding:18px_max(18px,env(safe-area-inset-right))_max(18px,env(safe-area-inset-bottom))_max(18px,env(safe-area-inset-left))]`;

const NAV_ITEMS = [
  { to: "/dashboard", modulo: "dashboard", label: "Dashboard", Icon: IconDashboard },
  { to: "/rrhh", modulo: "rrhh", label: "RRHH", Icon: IconRrhh },
  { to: "/operaciones", modulo: "operaciones", label: "Operaciones", Icon: IconOperaciones },
  { to: "/finanzas", modulo: "finanzas", label: "Finanzas", Icon: IconFinanzas },
  { to: "/administracion", modulo: "administracion", label: "Administración", Icon: IconAdministracion },
];

export function AppShell({ title, topbarExtra, children }) {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalPassword, setModalPassword] = useState(false);
  const [modalSesiones, setModalSesiones] = useState(false);
  const { usuario, tieneAcceso, logout } = useAuth();
  const { mostrarToast } = useToast();

  // El cierre por inactividad y por duración máxima lo maneja
  // <MonitorSesion /> (en App), para todas las pantallas.

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  // Solo se muestran los módulos a los que el usuario tiene acceso según
  // su rol. Esto es solo experiencia visual (punto 1.5 del roadmap): el
  // backend vuelve a validar el permiso en cada endpoint, ocultar la
  // opción del menú no es, por sí solo, seguridad real.
  const itemsVisibles = NAV_ITEMS.filter((item) => tieneAcceso(item.modulo));

  return (
    <div className={`flex overflow-hidden ${ALTO_PANTALLA}`}>
      {/* Overlay oscuro detrás del sidebar cuando está abierto en celular */}
      {menuAbierto && <div className={OVERLAY} onClick={() => setMenuAbierto(false)} />}

      {/* position:sticky + top:0 + su propio alto de pantalla: el menú no se
          desplaza cuando el contenido de la derecha es más largo, así
          siempre queda a mano para cambiar de sección. */}
      <aside className={`${SIDEBAR} ${menuAbierto ? SIDEBAR_ABIERTO : SIDEBAR_CERRADO}`}>
        <div className="flex items-center justify-between border-b border-b-ink-border px-5.5 pt-5.5 pb-4.5 max-lg:pt-[max(22px,env(safe-area-inset-top))]">
          <div className="font-display text-[19px] font-bold">
            Activo<span className="text-volt">360</span>
          </div>
          <button
            className={`sidebar-cerrar hidden p-1 text-on-ink-soft ${BOTON_ICONO_BARRA} max-lg:flex max-lg:items-center max-lg:justify-center`}
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
            type="button"
          >
            <IconClose width={18} height={18} />
          </button>
        </div>

        <nav className="nav flex flex-1 flex-col gap-0.5 px-3 py-4">
          {itemsVisibles.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `${NAV_LINK} ${isActive ? NAV_ACTIVO : NAV_INACTIVO}`}
              onClick={() => setMenuAbierto(false)}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Dos filas: avatar + nombre/empresas arriba, botones abajo. */}
        <div className="flex flex-wrap items-center gap-2.5 border-t border-t-ink-border p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          {/* --nav-activo: --copper es navy y no se vería sobre la barra */}
          <div
            className="flex size-9 flex-none items-center justify-center rounded-[50%] [background:var(--nav-activo)] text-[13px] font-semibold text-on-accent"
            aria-hidden="true"
          >
            {usuario?.iniciales || "—"}
          </div>
          <div className="min-w-0 flex-1">
            {/* Como mucho 2 líneas; el nombre completo queda en el title. */}
            <div
              className="overflow-hidden text-[13px] leading-[1.35] font-semibold text-on-ink [display:-webkit-box] [overflow-wrap:anywhere] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [line-clamp:2]"
              title={usuario?.nombre}
            >
              {usuario?.nombre || "Invitado"}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(usuario?.empresas || []).map((e) => (
                <span key={e} className="rounded-[10px] border border-ink-border px-[7px] py-0.5 text-xs text-on-ink-muted">
                  {e}
                </span>
              ))}
            </div>
          </div>
          {/* Fila propia debajo del nombre: con 3 botones de 44px al lado, un
              nombre largo quedaba aplastado y los botones encima del texto.
              pl-10: alineados con el texto, no con el avatar. */}
          <div className="flex [flex:1_0_100%] justify-start gap-1 pl-10">
            <button
              className={LOGOUT}
              onClick={() => {
                // En celular el menú lateral queda encima de los modales.
                setMenuAbierto(false);
                setModalSesiones(true);
              }}
              title="Sesiones y dispositivos"
              aria-label="Sesiones y dispositivos"
              type="button"
            >
              <IconDevices width={16} height={16} />
            </button>
            <button
              className={LOGOUT}
              onClick={() => {
                setMenuAbierto(false);
                setModalPassword(true);
              }}
              title="Cambiar contraseña"
              aria-label="Cambiar contraseña"
              type="button"
            >
              <IconLock width={16} height={16} />
            </button>
            <button className={LOGOUT} onClick={handleLogout} title="Cerrar sesión" aria-label="Cerrar sesión" type="button">
              <IconClose width={16} height={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className={`flex min-w-0 flex-1 flex-col overflow-hidden ${ALTO_PANTALLA}`}>
        <header className={TOPBAR}>
          <div className="flex min-w-0 items-center gap-3.5">
            <button
              className={`hamburger-btn ${BOTON_ICONO_BARRA} -m-1.5 hidden flex-none p-1.5 text-text hover:[background:var(--paper)] max-lg:flex max-lg:items-center max-lg:justify-center`}
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
              type="button"
            >
              <IconMenu width={20} height={20} />
            </button>
            <h1 className="m-0 truncate font-display text-[16px] font-semibold">{title}</h1>
          </div>
          <div className="topbar-right flex flex-none items-center gap-4.5">{topbarExtra}</div>
        </header>
        <main className={MAIN}>{children}</main>
      </div>

      <SesionesModal open={modalSesiones} onClose={() => setModalSesiones(false)} />

      <CambiarPasswordModal
        open={modalPassword}
        onClose={() => setModalPassword(false)}
        onExito={() => {
          setModalPassword(false);
          mostrarToast("Contraseña actualizada.", { tipo: "success" });
        }}
      />
    </div>
  );
}

// Barra de búsqueda + campanita de notificaciones — lista para usarse
// como topbarExtra en el Dashboard. Otras pantallas pasan sus propios
// botones (ej. "+ Nuevo contrato") como topbarExtra.
export function DefaultTopbarExtra() {
  return (
    <>
      <GlobalSearch />
      <NotificacionesBell />
    </>
  );
}
