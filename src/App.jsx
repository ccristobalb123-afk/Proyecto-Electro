import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Rrhh from "./pages/Rrhh";
import Operaciones from "./pages/Operaciones";
import Finanzas from "./pages/Finanzas";
import Administracion from "./pages/Administracion";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/rrhh" element={<Rrhh />} />
      <Route path="/operaciones" element={<Operaciones />} />
      <Route path="/finanzas" element={<Finanzas />} />
      <Route path="/administracion" element={<Administracion />} />
      {/* TODO: proteger estas rutas por sesión (redirigir a /login si no hay token) */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
