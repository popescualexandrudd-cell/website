/*
 * The Jungle Padel service worker (installable site, §9.4). Deliberately small:
 * - pages are always asked from the network (the account, bookings and prices are never stored on
 *   the phone); with no connection, the "you are offline" page of the visitor's language is shown;
 * - the site's own static files (scripts and styles with a hash in the name, fonts, icons, renders)
 *   are kept after the first visit, so the offline page and the next visits draw at once;
 * - the API is never touched: every answer comes live from the server.
 * A change here (not in the pages) needs a new VERSION, so phones pick it up and drop the old cache.
 */
const VERSION = "jungle-padel-1";
const OFFLINE = { ro: "/ro/offline", en: "/en/offline" };
const STATIC = /^\/(_next\/static|fonts|icons|renders)\//;
const MAX_STATIC = 200;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(Object.values(OFFLINE).map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function fromCacheOrNetwork(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    // Old builds' files go first; the offline pages are never dropped.
    const old = keys.filter((key) => STATIC.test(new URL(key.url).pathname));
    for (const key of old.slice(0, Math.max(0, old.length - MAX_STATIC))) await cache.delete(key);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    const offline = url.pathname.startsWith("/en") ? OFFLINE.en : OFFLINE.ro;
    event.respondWith(fetch(request).catch(async () => (await caches.match(offline)) ?? Response.error()));
    return;
  }
  if (STATIC.test(url.pathname)) event.respondWith(fromCacheOrNetwork(request));
});
