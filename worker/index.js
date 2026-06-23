// Custom service worker — push notification handler
// Digabung dengan service worker yang di-generate oleh @ducanh2912/next-pwa

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Notifikasi Baru", body: event.data.text() };
  }

  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    data: { url: payload.url || "/" },
    vibrate: [200, 100, 200],
    tag: payload.tag || "jualbeliusu-notif",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "Jual Beli USU", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
