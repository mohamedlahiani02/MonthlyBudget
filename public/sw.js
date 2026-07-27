// Minimal service worker — enables install ("Add to app") on desktop/Android
// and provides a light offline shell for static assets.
const CACHE = "mb-cache-v1";

self.addEventListener("install", (event) => {
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
  const { request } = event;

  // Only handle GET; never cache API calls or non-http(s) requests.
  if (request.method !== "GET" || !request.url.startsWith("http")) return;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return;

  // Network-first with cache fallback for navigations & static assets.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request))
  );
});
