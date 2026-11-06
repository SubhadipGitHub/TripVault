/* Trip Vault service worker: caches the app shell so it works offline.
   It never touches your data (that lives in IndexedDB) and never makes third-party requests. */
const VERSION = "tv-v1";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/data.js", "js/core.js", "js/store.js", "js/parsers.js", "js/model.js", "js/forms.js", "js/backup.js",
  "js/security.js", "js/memories.js", "js/wrapped.js", "js/search.js", "js/views.js", "js/main.js",
  "assets/icon.svg", "assets/icon-192.png", "assets/icon-512.png", "assets/apple-touch-icon.png"
];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // network-first so updates arrive quickly; fall back to cache when offline
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
});
