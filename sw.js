/* Nine Angels Villa — Service Worker */
const CACHE_NAME = 'nine-angels-v1';
const STATIC_ASSETS = [
  '/index.html',
  '/events.html',
  '/stays.html',
  '/gallery.html',
  '/contact.html',
  '/info.html',
  '/quote.html',
  '/submissions.html',
  '/404.html',
  '/styles.css',
  '/shared.js',
  '/quote.js',
  '/manifest.json'
];

// Install — cache core shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — purge old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Navigate (HTML): network-first, fallback to cache, then offline page
// - Images: cache-first (long TTL)
// - Everything else: stale-while-revalidate
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isLocal = url.origin === self.location.origin;
  if (!isLocal) return; // don't intercept cross-origin (fonts, booking engine)

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request)
            .then(r => r || caches.match('/404.html'))
        )
    );
    return;
  }

  // Images: cache-first
  if (request.destination === 'image' || url.pathname.match(/\.(jpe?g|png|gif|webp|svg)$/i)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for CSS/JS/fonts
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return response;
      });
      return cached || network;
    })
  );
});
