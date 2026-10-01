/*
 * The Jungle Padel service worker (installable site, §9.4). Deliberately small:
 * - pages are always asked from the network (the account, bookings and prices are never stored on
 *   the phone); with no connection, the "you are offline" page of the visitor's language is shown;
 * - the site's own static files (scripts and styles with a hash in the name, fonts, icons, renders)
 *   are kept after the first visit, so the offline page and the next visits draw at once;
 * - the API is never touched: every answer comes live from the server;
 * - the club's push notifications (Stage 12, Q17) are shown, and a tap opens the page they are
 *   about (only one of the club's own pages).
 * A change here (not in the pages) needs a new VERSION, so phones pick it up and drop the old cache.
 */
const VERSION = "jungle-padel-3";
const OFFLINE = { ro: "/ro/offline", en: "/en/offline" };
const STATIC = /^\/(_next\/static|fonts|icons|renders)\//;
const MAX_STATIC = 200;

/**
 * The offline pages, and every script, style and font they use: with no connection the page must
 * draw and come alive from the phone alone (a missing script would turn it into an error page).
 */
async function keepOfflinePages() {
  const cache = await caches.open(VERSION);
  const files = new Set();
  for (const url of Object.values(OFFLINE)) {
    const response = await fetch(new Request(url, { cache: "reload" }));
    if (!response.ok) throw new Error(`offline page ${url}: ${response.status}`);
    const html = await response.clone().text();
    for (const match of html.matchAll(/["'(](\/(?:_next\/static|fonts)\/[^"'()\s]+)/g)) files.add(match[1]);
    await cache.put(url, response);
  }
  await cache.addAll([...files]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(keepOfflinePages().then(() => self.skipWaiting()));
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

self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = {};
  }
  event.waitUntil(
    self.registration.showNotification(message.title || "Jungle Padel", {
      body: message.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: message.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  // Only the club's own pages: a message never opens another site.
  const url = target.origin === self.location.origin ? target.href : self.location.origin + "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url === url && "focus" in client);
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
