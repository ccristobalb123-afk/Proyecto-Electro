import { NavLink } from "react-router-dom";
import {
  IconDashboard,
  IconRrhh,
  IconOperaciones,
  IconFinanzas,
  IconAdministracion,
  IconSearch,
  IconBell,
} from "../icons/Icons";
import "./AppShell.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { to: "/rrhh", label: "RRHH", Icon: IconRrhh },
  { to: "/operaciones", label: "Operaciones", Icon: IconOperaciones },
  { to: "/finanzas", label: "Finanzas", Icon: IconFinanzas },
  { to: "/administracion", label: "Administración", Icon: IconAdministracion },
];

// TODO: reemplazar por el usuario real de la sesión (contexto de auth)
// y filtrar NAV_ITEMS según sus módulos con acceso — "Administración"
// solo debe aparecer si usuario.rol === "ADMINISTRADOR".
const usuarioActual = {
  nombre: "Cristian",
  iniciales: "CC",
  empresas: ["Corevex", "Electro"],
};

export function AppShell({ title, topbarExtra, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="wordmark font-display">
            Activo<span>360</span>
          </div>
        </div>

        <nav className="nav">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{usuarioActual.iniciales}</div>
          <div>
            <div className="name">{usuarioActual.nombre}</div>
            <div className="company-pills">
              {usuarioActual.empresas.map((e) => (
                <span key={e}>{e}</span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div className="content">
        <div className="topbar">
          <h1 className="font-display">{title}</h1>
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
export function DefaultTopbarExtra({ alertCount = 0 }) {
  return (
    <>
      <div className="search">
        <IconSearch width={14} height={14} />
        <input placeholder="Buscar contrato, equipo, camión..." />
      </div>
      <div className="bell-wrap">
        <IconBell width={19} height={19} stroke="#374151" />
        {alertCount > 0 && <span className="bell-badge">{alertCount}</span>}
      </div>
    </>
  );
}
