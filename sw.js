/* Trip Vault service worker: caches the app shell so it works offline.
   It never touches your data (that lives in IndexedDB) and never makes third-party requests. */
const VERSION = "tv-v3";
const SHARE = "tv-share"; // short-lived inbox for files shared to the installed app
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/data.js", "js/core.js", "js/i18n.js", "js/store.js", "js/parsers.js", "js/model.js", "js/forms.js", "js/backup.js",
  "js/security.js", "js/memories.js", "js/wrapped.js", "js/search.js", "js/extras.js", "js/pass.js", "js/ideas.js", "js/views.js", "js/main.js",
  "assets/icon.svg", "assets/icon-192.png", "assets/icon-512.png", "assets/apple-touch-icon.png"
];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== SHARE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Share target: the OS posts shared files/text here. Stash them for the page and redirect to it.
async function receiveShare(req) {
  try {
    const fd = await req.formData();
    await caches.delete(SHARE);
    const c = await caches.open(SHARE), at = k => new URL(k, self.registration.scope).href;
    const files = fd.getAll("files").filter(f => f && typeof f === "object" && f.size > 0).slice(0, 20);
    const meta = { text: ["title", "text", "url"].map(k => fd.get(k)).filter(v => typeof v === "string" && v.trim()).join("\n"), files: [] };
    for (let i = 0; i < files.length; i++) {
      const key = "__share/f" + i;
      await c.put(at(key), new Response(files[i], { headers: { "content-type": files[i].type || "application/octet-stream" } }));
      meta.files.push({ key, name: files[i].name || "shared-" + (i + 1), type: files[i].type || "" });
    }
    await c.put(at("__share/meta"), new Response(JSON.stringify(meta), { headers: { "content-type": "application/json" } }));
  } catch (err) { /* the page reports "nothing came through" */ }
  return Response.redirect(new URL("./?share=1", self.registration.scope).href, 303);
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method === "POST" && new URL(req.url).pathname.endsWith("/share-target")) { e.respondWith(receiveShare(req)); return; }
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // network-first so updates arrive quickly; fall back to cache when offline
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
});
