// ilo sitelen service worker: keeps the app usable offline.
// The sitelen pona font is embedded in index.html, so caching the shell is enough.
// Bump CACHE with every deploy. The changed file is what makes the browser install this worker again,
// and the page shows its Update banner once the new worker is installed and waiting.
const CACHE = "ilo-sitelen-v27";
const PAGE = new URL("./", self.location.href).href;
const SHELL = [
  PAGE,
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
].map((p) => new URL(p, self.location.href).href);

self.addEventListener("install", (event) => {
  // No skipWaiting here: the new worker waits until the page asks for it from the Update banner,
  // or until every open page is closed. A running page is never switched to a new worker behind its back.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  // Old caches go, and the first worker takes the pages that loaded before it existed. Neither step waits on the other.
  event.waitUntil(Promise.all([
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .catch(() => {}),
    self.clients.claim(),
  ]));
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
    // The page and the rest of the shell come from the cache so the app opens at once, with a refresh in the
    // background for next time. Any navigation to the page (the start_url with its query, or /index.html) maps onto
    // the one cached copy. A new version ships with a new CACHE name, and the page offers to switch once that worker
    // is installed. Other same-origin requests (og-2.png, the sitemap, a 404 route) go to the network as usual.
    const plain = url.origin + url.pathname;
    const isPage = req.mode === "navigate" && (plain === PAGE || plain === PAGE + "index.html");
    if (!isPage && !SHELL.includes(plain)) return;
    const key = isPage ? PAGE : plain;
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(key).then((hit) => {
          const refresh = fetch(req).then((res) => {
            if (res.ok) event.waitUntil(cache.put(key, res.clone()).catch(() => {}));
            return res;
          });
          if (!hit) return refresh;
          event.waitUntil(refresh.catch(() => {}));
          return hit;
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
            if (res.ok) event.waitUntil(caches.open(CACHE).then((cache) => cache.put(req, res.clone())).catch(() => {}));
            return res;
          })
          .catch(() => hit);
        return hit || refresh;
      })
    );
  }
});
