// Service worker: permite instalar la app y abrirla sin conexión.
// Al cambiar archivos de la app, sube VERSION para que los dispositivos se actualicen.
const VERSION = 'v2.1.0';
const SHELL = `cv-shell-${VERSION}`;
const RUNTIME = 'cv-runtime';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/auth.js',
  './js/cloud.js',
  './js/firebase-config.js',
  './js/store.js',
  './js/ui.js',
  './js/views.js',
  './js/wishlist.js',
  './js/forms.js',
  './js/mana.js',
  './js/utils.js',
  './js/scryfall.js',
  './js/demo.js',
  './js/fx.js',
  './js/roulette.js',
  './js/achievements.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cv-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Recursos que no cambian para una misma URL: caché primero
const isImmutable = (url) =>
  url.hostname === 'cards.scryfall.io' ||
  (url.hostname === 'api.scryfall.com' && url.searchParams.get('format') === 'image') ||
  url.hostname === 'fonts.googleapis.com' ||
  url.hostname === 'fonts.gstatic.com' ||
  (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (isImmutable(url)) {
    e.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Archivos de la app: red primero (para recibir actualizaciones), caché si no hay conexión
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
    );
  }
  // Todo lo demás (Firebase, búsquedas en Scryfall…) va directo a la red
});
