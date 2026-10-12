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
    // Mismo aviso (o el resumen del día) reemplaza al anterior en vez de
    // apilarse si el teléfono todavía lo tiene en la bandeja.
    ...(payload.tag ? { tag: payload.tag } : {}),
    // vibrate: patrón corto — 2 pulsos, como la mayoría de apps de
    // avisos (no queremos que se sienta invasivo, solo notorio).
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(payload.titulo || "Activo360", opciones));
});

// Al tocar la notificación: si la app ya está abierta, la enfoca y la
// lleva a la pantalla del aviso (ej. /operaciones?tab=vehiculos&q=ABC-123);
// si no, la abre ahí. Antes, con la app abierta en otra pantalla, abría
// una ventana nueva.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (listaClientes) => {
      const abierto = listaClientes.find((c) => new URL(c.url).origin === self.location.origin);
      if (abierto) {
        const enfocado = "focus" in abierto ? await abierto.focus() : abierto;
        if (abierto.url !== destino && "navigate" in enfocado) return enfocado.navigate(destino);
        return enfocado;
      }
      if (clients.openWindow) return clients.openWindow(destino);
    })
  );
});
