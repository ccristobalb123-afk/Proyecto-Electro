import { useEffect, useState } from "react";
import * as pushService from "../services/pushService";

// El navegador pide la clave pública en base64 URL-safe, pero la API
// de suscripción push necesita un Uint8Array — esta es la conversión
// estándar que recomienda la documentación de Web Push.
function convertirClave(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const datosCrudos = window.atob(base64);
  return Uint8Array.from([...datosCrudos].map((c) => c.charCodeAt(0)));
}

// Notificaciones push del navegador — funcionan en Android/Chrome y
// escritorio. En iPhone, Safari solo las permite si la página está
// agregada a la pantalla de inicio como app.
export function usePushNotifications() {
  const [soportado, setSoportado] = useState(false);
  const [permiso, setPermiso] = useState("default");
  const [activando, setActivando] = useState(false);
  const [suscrito, setSuscrito] = useState(false);

  useEffect(() => {
    const soportaPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSoportado(soportaPush);
    if (soportaPush) {
      setPermiso(Notification.permission);
      navigator.serviceWorker.getRegistration().then(async (registro) => {
        const suscripcion = await registro?.pushManager.getSubscription();
        setSuscrito(!!suscripcion);
      });
    }
  }, []);

  async function activar() {
    setActivando(true);
    try {
      const registro = await navigator.serviceWorker.register("/sw.js");
      const resultadoPermiso = await Notification.requestPermission();
      setPermiso(resultadoPermiso);
      if (resultadoPermiso !== "granted") return false;

      const { publicKey, configurado } = await pushService.obtenerClavePublica();
      if (!configurado) {
        console.warn("El servidor todavía no tiene configuradas las claves VAPID (ver .env.example del backend).");
        return false;
      }

      const suscripcionExistente = await registro.pushManager.getSubscription();
      const suscripcion =
        suscripcionExistente ||
        (await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertirClave(publicKey),
        }));

      await pushService.suscribir(suscripcion.toJSON());
      setSuscrito(true);
      return true;
    } finally {
      setActivando(false);
    }
  }

  async function desactivar() {
    const registro = await navigator.serviceWorker.getRegistration();
    const suscripcion = await registro?.pushManager.getSubscription();
    if (suscripcion) {
      await pushService.desuscribir(suscripcion.endpoint);
      await suscripcion.unsubscribe();
    }
    setSuscrito(false);
  }

  return { soportado, permiso, activando, suscrito, activar, desactivar };
}
