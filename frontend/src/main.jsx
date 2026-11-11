import "./utils/plataforma.js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/tokens.css";
// Tailwind (tema, base.css en la capa "base" y utilidades, todo en capas:
// el CSS sin capa de arriba y de cada módulo le gana siempre). base.css ya
// no se importa acá: entra por tailwind.css. Ver docs/tailwind.md.
import "./styles/tailwind.css";
import "./styles/foco.css";
import "./styles/motion.css";
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
