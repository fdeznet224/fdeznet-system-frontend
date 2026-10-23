/* Notificaciones del portal del cliente. Lo carga el service worker de la app
   (vite.config.ts → workbox.importScripts). El servidor manda {titulo, cuerpo, url}. */

self.addEventListener('push', (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = { cuerpo: evento.data ? evento.data.text() : '' };
  }
  evento.waitUntil(self.registration.showNotification(datos.titulo || 'Aviso', {
    body: datos.cuerpo || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: datos.url || '/cliente/inicio' },
  }));
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const url = (evento.notification.data && evento.notification.data.url) || '/cliente/inicio';
  evento.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
    const abierta = ventanas.find((v) => new URL(v.url).pathname.startsWith('/cliente'));
    if (abierta) {
      abierta.navigate(url);
      return abierta.focus();
    }
    return self.clients.openWindow(url);
  }));
});
