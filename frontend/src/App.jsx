import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute, RutaPublicaSoloInvitado } from "./components/auth/ProtectedRoute";

// Cada página se descarga al entrar a su ruta (code-splitting): así Chart.js
// (Dashboard) y qrcode (Login) no viajan con quien solo abre otra sección.
const Login = lazy(() => import("./pages/Login"));
const RestablecerPassword = lazy(() => import("./pages/RestablecerPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Rrhh = lazy(() => import("./pages/Rrhh"));
const Operaciones = lazy(() => import("./pages/Operaciones"));
const Finanzas = lazy(() => import("./pages/Finanzas"));
const Administracion = lazy(() => import("./pages/Administracion"));

export default function App() {
  return (
    // Mismo aspecto que la pantalla de "Cargando sesión..." de ProtectedRoute,
    // para que la transición entre ambas no parpadee.
    <Suspense fallback={<div className="pantalla-cargando-sesion">Cargando...</div>}>
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
        <Route path="/restablecer-password" element={<RestablecerPassword />} />
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
    </Suspense>
  );
}
