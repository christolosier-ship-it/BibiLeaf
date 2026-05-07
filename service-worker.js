// BibiLeaf Service Worker
const CACHE_NAME = 'bibileaf-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/src/storage/idb.js',
  '/src/models/plant.js',
  '/src/utils/date.js',
  '/src/utils/calc.js',
  '/src/ui/components/card.js',
  '/src/ui/components/form.js',
  '/src/ui/components/modal.js',
  '/src/ui/components/calendar.js',
  '/src/import-export/xlsx.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request).catch(() => cached))
  );
});

// Notifications locales
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
