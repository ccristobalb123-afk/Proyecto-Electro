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
    <div className="app-shell">
      {/* Overlay oscuro detrás del sidebar cuando está abierto en celular */}
      {menuAbierto && <div className="sidebar-overlay" onClick={() => setMenuAbierto(false)} />}

      <aside className={`sidebar ${menuAbierto ? "sidebar--abierto" : ""}`}>
        <div className="sidebar-brand">
          <div className="wordmark font-display">
            Activo<span>360</span>
          </div>
          <button
            className="sidebar-cerrar"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
            type="button"
          >
            <IconClose width={18} height={18} />
          </button>
        </div>

        <nav className="nav">
          {itemsVisibles.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setMenuAbierto(false)}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{usuario?.iniciales || "—"}</div>
          <div className="sidebar-user-info">
            <div className="name">{usuario?.nombre || "Invitado"}</div>
            <div className="company-pills">
              {(usuario?.empresas || []).map((e) => (
                <span key={e}>{e}</span>
              ))}
            </div>
          </div>
          <button
            className="logout-btn"
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
          <button className="logout-btn" onClick={() => {
              setMenuAbierto(false);
              setModalPassword(true);
            }}
            title="Cambiar contraseña" aria-label="Cambiar contraseña" type="button">
            <IconLock width={16} height={16} />
          </button>
          <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión" aria-label="Cerrar sesión" type="button">
            <IconClose width={16} height={16} />
          </button>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="hamburger-btn"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
              type="button"
            >
              <IconMenu width={20} height={20} />
            </button>
            <h1 className="font-display">{title}</h1>
          </div>
          <div className="topbar-right">{topbarExtra}</div>
        </header>
        <main className="main">{children}</main>
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
