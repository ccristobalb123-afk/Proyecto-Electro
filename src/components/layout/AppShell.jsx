import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  IconDashboard,
  IconRrhh,
  IconOperaciones,
  IconFinanzas,
  IconAdministracion,
  IconSearch,
  IconMenu,
  IconClose,
} from "../icons/Icons";
import { useInactividad } from "../../hooks/useInactividad";
import AvisoInactividad from "../shared/AvisoInactividad";
import NotificacionesBell from "../shared/NotificacionesBell";
import { useAuth } from "../../context/AuthContext";
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
  const { usuario, tieneAcceso, logout } = useAuth();

  // Cierra sesión y devuelve a /login tras 30 min de inactividad, avisando
  // con 1 minuto de anticipación.
  const { mostrarAviso, segundosRestantes, seguirConectado } = useInactividad({
    tiempoInactividadMinutos: 30,
    tiempoAvisoMinutos: 1,
    activo: true,
    onCerrarSesion: () => {
      logout();
      navigate("/login");
    },
  });

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
      {mostrarAviso && (
        <AvisoInactividad segundosRestantes={segundosRestantes} onSeguirConectado={seguirConectado} />
      )}

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
          <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión" type="button">
            <IconClose width={16} height={16} />
          </button>
        </div>
      </aside>

      <div className="content">
        <div className="topbar">
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
        </div>
        <div className="main">{children}</div>
      </div>
    </div>
  );
}

// Barra de búsqueda + campanita de notificaciones — lista para usarse
// como topbarExtra en el Dashboard. Otras pantallas pasan sus propios
// botones (ej. "+ Nuevo contrato") como topbarExtra.
export function DefaultTopbarExtra() {
  return (
    <>
      <div className="search">
        <IconSearch width={14} height={14} />
        <input placeholder="Buscar contrato, equipo, camión..." />
      </div>
      <NotificacionesBell />
    </>
  );
}
