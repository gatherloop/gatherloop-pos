self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.tag,
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: { url: payload.url },
      silent: false,
      vibarte: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  if (!url) {
    return;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const targetUrl = new URL(url, self.location.origin).href;
        const existingClient = clients.find(
          (client) => client.url === targetUrl
        );
        if (existingClient) {
          return existingClient.focus();
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
