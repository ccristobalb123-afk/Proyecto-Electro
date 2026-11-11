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

// Tras una publicación, una pestaña abierta sigue con el JS anterior y, al
// entrar a una pantalla que no había cargado, pide un chunk que ya no
// existe (vite build borra los de la versión anterior; el servidor da 404).
// Vite avisa con "vite:preloadError": se recarga la página UNA vez para
// tomar la versión nueva. Si ya se recargó hace menos de 10 s (el archivo
// sigue faltando), no se recarga otra vez y el error sigue su curso, para
// no entrar en un bucle. Sin sessionStorage (bloqueado) no hay forma de
// saberlo: tampoco se recarga.
const MARCA_RECARGA = "recarga-por-chunk";
window.addEventListener("vite:preloadError", (evento) => {
  try {
    const ultima = Number(sessionStorage.getItem(MARCA_RECARGA)) || 0;
    if (Date.now() - ultima < 10_000) return;
    sessionStorage.setItem(MARCA_RECARGA, String(Date.now()));
  } catch {
    return;
  }
  evento.preventDefault();
  window.location.reload();
});

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
