// Offline copy of the app. Written into the build by build/offline.ts, which
// fills in the file list and version. It only ever stores this site's own
// files; it never sees or keeps anything you open in the tools.

const VERSION = '__VERSION__';
const FILES = __FILES__;
const CACHE = `ptk-${VERSION}`;
const SCOPE = self.registration.scope;
const SHELL = new URL('index.html', SCOPE).href;
const ASSETS = new URL('assets/', SCOPE).href;
// A page on a slow connection waits this long before the saved copy is used.
const NAV_TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(FILES.map((file) => new Request(new URL(file, SCOPE), { cache: 'reload' }))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('ptk-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** The live page when the network answers in time, else the saved one. */
async function page(request) {
  const saved = caches.match(SHELL, { ignoreVary: true });
  try {
    const live = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), NAV_TIMEOUT_MS)),
    ]);
    if (live.ok) return live;
    return (await saved) ?? live;
  } catch {
    const copy = await saved;
    if (copy) return copy;
    return Response.error();
  }
}

/** Hashed files never change, so a saved copy is always right. */
async function asset(request) {
  // Module scripts are asked for with an Origin header; servers that answer
  // with "Vary: Origin" would otherwise never match the saved copy.
  const saved = await caches.match(request, { ignoreVary: true });
  if (saved) return saved;
  const live = await fetch(request);
  if (live.ok && request.url.startsWith(ASSETS)) {
    const copy = live.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return live;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Other sites, and the "is there a newer version" check, go straight to the network.
  if (url.origin !== self.location.origin || url.search) return;
  if (request.mode === 'navigate') {
    event.respondWith(page(request));
    return;
  }
  if (!request.url.startsWith(SCOPE)) return;
  event.respondWith(asset(request));
});
