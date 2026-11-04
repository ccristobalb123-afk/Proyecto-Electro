import "./utils/plataforma.js";
import "./styles/base.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/tokens.css";
// Tailwind (solo tema y utilidades, en capas: el CSS de arriba y de cada
// módulo le gana siempre). Ver docs/tailwind.md.
import "./styles/tailwind.css";
import "./styles/motion.css";
import "./styles/buttons.css";
import "./styles/badges.css";
import "./styles/filters.css";
import "./styles/fichas.css";
import "./styles/responsive.css";
import "./styles/tarjetas.css";
import App from "./App.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { ConfirmProvider } from "./context/ConfirmContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
