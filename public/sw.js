// Service Worker for Web Push Notifications (background/locked screen)

// Handle push events from the server
self.addEventListener('push', (event) => {
  let data = {
    title: 'Nova Notificação',
    body: 'Você tem uma nova notificação',
    tag: 'default',
    url: '/admin/orders',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300, 100, 300],
    silent: false,
    data: { url: data.url },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/admin/orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window with the right path
      for (const client of clientList) {
        const clientPath = new URL(client.url).pathname;
        if (clientPath.startsWith(url.split('/').slice(0, 2).join('/')) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open a new window if none found
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Keep service worker alive for notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
