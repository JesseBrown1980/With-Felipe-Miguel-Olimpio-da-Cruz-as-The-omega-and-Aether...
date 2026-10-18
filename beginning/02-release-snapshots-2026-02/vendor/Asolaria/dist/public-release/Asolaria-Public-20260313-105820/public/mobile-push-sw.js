self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Keep a fetch handler so installability checks can treat this as a PWA worker.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

function parsePayload(event) {
  if (!event.data) {
    return {};
  }
  try {
    return event.data.json();
  } catch (_error) {
    return {
      body: String(event.data.text() || "")
    };
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePayload(event);
  const title = String(payload.title || "Asolaria Alert");
  const body = String(payload.body || "Attention needed.");
  const url = String(payload.url || "/phone-mode.html");
  const tag = String(payload.tag || "asolaria-mobile-alert");
  const data = payload.data && typeof payload.data === "object"
    ? payload.data
    : {};
  const options = {
    body,
    tag,
    silent: true,
    renotify: true,
    requireInteraction: false,
    data: {
      ...data,
      url
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = String(event.notification?.data?.url || "/phone-mode.html");
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });
    for (const client of allClients) {
      if (
        client.url
        && (
          client.url.includes("/phone-mode.html")
          || client.url.includes("/mobile-approvals.html")
          || client.url.includes("/mobile-console.html")
        )
      ) {
        await client.focus();
        if (typeof client.navigate === "function") {
          await client.navigate(url);
        }
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
