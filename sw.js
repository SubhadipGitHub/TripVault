/* Trip Vault service worker: caches the app shell so it works offline.
   It never touches your data (that lives in IndexedDB) and makes no third-party requests itself. (Offline speech and
   translation packs come from Hugging Face only when you download one; js/ai-worker.js fetches and caches those.) */
const VERSION = "tv-v21";
const SHARE = "tv-share"; // short-lived inbox for files shared to the installed app
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/data.js", "js/core.js", "js/store.js", "js/parsers.js", "js/model.js", "js/forms.js", "js/backup.js",
  "js/security.js", "js/memories.js", "js/wrapped.js", "js/search.js", "js/extras.js", "js/pass.js", "js/ocr.js", "js/transfer.js", "js/ideas.js", "js/avatars.js", "js/sync-config.js", "js/gsync.js", "js/privacy.js", "js/profile.js", "js/help.js", "js/apps.js", "js/phrases.js", "js/offline-ai.js", "js/ai-worker.js", "js/converse.js", "js/views.js", "js/main.js",
  "vendor/three/three.module.min.js", "vendor/three/three.core.min.js",
  "assets/icon.svg", "assets/icon-192.png", "assets/icon-512.png", "assets/apple-touch-icon.png"
];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
// On update, keep the big on-demand files under vendor/ (text reader, offline speech & translation runtime) so they
// still work offline after the app updates, then drop the old caches.
async function carryVendor(old) {
  const to = await caches.open(VERSION);
  for (const k of old) {
    const c = await caches.open(k);
    for (const req of await c.keys()) {
      if (!new URL(req.url).pathname.includes("/vendor/") || await to.match(req)) continue;
      const res = await c.match(req); if (res) await to.put(req, res);
    }
  }
}
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(async ks => {
    const old = ks.filter(k => k !== VERSION && k !== SHARE && k.startsWith("tv-"));
    try { await carryVendor(old); } catch (err) { /* worst case they download again on next use */ }
    await Promise.all(old.map(k => caches.delete(k)));
  }).then(() => self.clients.claim()));
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
  // network-first so updates arrive quickly; fall back to cache when offline.
  // The OCR files under vendor/ are not precached (about 7 MB): they are cached here on first use.
  // cache: "no-cache" revalidates with the server, so a new deploy isn't hidden behind the browser's HTTP cache
  e.respondWith(fetch(req, { cache: "no-cache" }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
});
