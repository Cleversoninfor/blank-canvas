// Service Worker for Web Push Notifications (background/locked screen)
// IMPORTANT: This file must be at the root scope (/sw.js) to control all pages.

const SW_VERSION = 'v3';

// ─── INSTALL ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  // Skip waiting so the new SW activates immediately (no reload needed)
  event.waitUntil(self.skipWaiting());
});

// ─── ACTIVATE ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  // Claim all open clients immediately so push events are handled by this SW
  event.waitUntil(clients.claim());
});

// ─── FETCH (required for iOS Safari PWA to keep SW alive) ──────────────────────
self.addEventListener('fetch', () => {
  // Intentionally empty — just having this handler registered keeps the SW
  // from being killed by iOS/Safari while the app is running.
});

// ─── PUSH ──────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: 'Nova Notificação',
    body: 'Você tem uma nova notificação',
    tag: 'default',
    url: '/admin/orders',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag,
    renotify: true,
    requireInteraction: true,
    // Vibration pattern: on-off-on cycles (milliseconds)
    vibrate: [500, 200, 500, 200, 500, 200, 1000],
    silent: false,
    // Store the target URL inside notification data for click handling
    data: { url: data.url },
    // Actions give the user quick options on the lock screen (Android Chrome)
    actions: [
      { action: 'open', title: '👀 Ver pedido' },
      { action: 'dismiss', title: 'Ignorar' },
    ],
  };

  // Broadcast to all open windows so they can play the alarm sound
  const notifyClients = clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      for (const client of clientList) {
        client.postMessage({
          type: 'PUSH_RECEIVED',
          payload: {
            title: data.title,
            body: data.body,
            tag: data.tag,
            url: data.url,
          },
        });
      }
    });

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, notificationOptions),
      notifyClients,
    ])
  );
});

// ─── NOTIFICATION CLICK ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  if (action === 'dismiss') return; // user explicitly dismissed

  const url = event.notification.data?.url || '/admin/orders';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window on the right path
        for (const client of clientList) {
          try {
            const clientPath = new URL(client.url).pathname;
            const targetBase = url.split('/').slice(0, 3).join('/');
            if (clientPath.startsWith(targetBase) && 'focus' in client) {
              client.navigate(url);
              return client.focus();
            }
          } catch {
            // ignore invalid URLs
          }
        }
        // Open a new window if none matched
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// ─── NOTIFICATION CLOSE (dismissed without click) ──────────────────────────────
self.addEventListener('notificationclose', (event) => {
  // Broadcast to open windows so they can stop the alarm sound
  clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      for (const client of clientList) {
        client.postMessage({
          type: 'PUSH_DISMISSED',
          payload: { tag: event.notification.tag },
        });
      }
    });
});
