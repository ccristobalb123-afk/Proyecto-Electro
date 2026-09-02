import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Rrhh from "./pages/Rrhh";
import Operaciones from "./pages/Operaciones";
import Finanzas from "./pages/Finanzas";
import Administracion from "./pages/Administracion";
import { ProtectedRoute, RutaPublicaSoloInvitado } from "./components/auth/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={
          <RutaPublicaSoloInvitado>
            <Login />
          </RutaPublicaSoloInvitado>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute modulo="dashboard">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rrhh"
        element={
          <ProtectedRoute modulo="rrhh">
            <Rrhh />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operaciones"
        element={
          <ProtectedRoute modulo="operaciones">
            <Operaciones />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finanzas"
        element={
          <ProtectedRoute modulo="finanzas">
            <Finanzas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/administracion"
        element={
          <ProtectedRoute modulo="administracion">
            <Administracion />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
