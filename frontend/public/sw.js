/* AgriGPT service worker: offline shell + stale-while-revalidate for GETs.
   Strategy:
   - Never cache POST/AI requests (always network).
   - App shell + static assets: cache-first.
   - Pages & API GETs: network-first with cache fallback (so data is fresh
     when online, last-known when offline — critical for rural connectivity). */
const CACHE = "agrigpt-v1";
const SHELL = ["/", "/dashboard", "/auth/login", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // chat/market POSTs always hit the network

  const url = new URL(req.url);
  const isApi = url.pathname.startsWith("/api/") || url.port === "8000";
  const isStatic = url.pathname.startsWith("/_next/static") || url.pathname === "/manifest.json";

  if (isStatic) {
    // Cache-first for immutable assets
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // Network-first with offline fallback for pages + API GETs
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.destination === "" || isApi || req.mode === "navigate")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match("/dashboard"))
      )
  );
});

/* Push notifications (wired to backend web-push when VAPID keys are set) */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "AgriGPT", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "AgriGPT alert", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/dashboard"));
});
