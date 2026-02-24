// custom-sw.js - Push notification handler for MozHost
self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options = {
      body: data.message || data.body || '',
      icon: data.icon || '/mozhost.png',
      badge: data.badge || '/mozhost.png',
      tag: data.tag || 'mozhost-notification',
      data: {
        url: data.url || '/'
      },
      vibrate: [200, 100, 200],
      requireInteraction: false
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'MozHost', options)
    );
  } catch (e) {
    console.error('Erro ao processar push:', e);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
