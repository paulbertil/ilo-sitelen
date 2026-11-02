// ilo sitelen service worker: keeps the app usable offline.
// The sitelen pona font is embedded in index.html, so caching the shell is enough.
// Bump CACHE with every deploy. The changed file is what makes the browser install this worker again,
// and the page shows its Update banner once the new worker is installed and waiting.
const CACHE = "ilo-sitelen-v12";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  // No skipWaiting here: the new worker waits until the page asks for it from the Update banner,
  // or until every open page is closed. A running page keeps the worker and cache it started with.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Sent by the page when the user taps Update. Taking over fires controllerchange there, and the page reloads.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // App shell: cache first so the app opens at once, refreshed in the background for next time.
    // A new version ships with a new CACHE name, and the page offers to switch once that worker is installed.
    // Every navigation, including the start_url with its query, maps onto the one page.
    const key = req.mode === "navigate" ? "./" : req;
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(key).then((hit) => {
          const refresh = fetch(req).then((res) => {
            if (res.ok) cache.put(key, res.clone());
            return res;
          });
          if (hit) { refresh.catch(() => {}); return hit; }
          return refresh;
        })
      )
    );
    return;
  }

  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // UI web fonts: serve what we have, refresh in the background.
    event.respondWith(
      caches.match(req).then((hit) => {
        const refresh = fetch(req)
          .then((res) => {
            if (res.ok) caches.open(CACHE).then((cache) => cache.put(req, res.clone()));
            return res;
          })
          .catch(() => hit);
        return hit || refresh;
      })
    );
  }
});
