// Service worker de Activo360 — solo se encarga de las notificaciones
// push. No cachea nada de la app (no es un service worker "offline"),
// así que no hay riesgo de que alguien vea una versión vieja de la app
// por culpa de una caché mal invalidada.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { titulo: "Activo360", cuerpo: event.data.text() };
  }

  const opciones = {
    body: payload.cuerpo,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: { url: payload.url || "/dashboard" },
    // vibrate: patrón corto — 2 pulsos, como la mayoría de apps de
    // avisos (no queremos que se sienta invasivo, solo notorio).
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(payload.titulo || "Activo360", opciones));
});

// Al tocar la notificación, abre (o enfoca si ya está abierta) la
// pantalla correspondiente en vez de solo cerrar el aviso.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((listaClientes) => {
      for (const cliente of listaClientes) {
        if (cliente.url.includes(url) && "focus" in cliente) {
          return cliente.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
