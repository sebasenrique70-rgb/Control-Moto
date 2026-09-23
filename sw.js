// sw.js — deja la app usable sin internet.
// Estrategia: cache-first para todo el "app shell" (nada de esto cambia entre
// visitas salvo cuando subís una versión nueva, que es cuando subís CACHE_VERSION).
var CACHE_VERSION = 'control-moto-v1';

var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './storage.js',
  './fonts/poppins-400.woff2',
  './fonts/poppins-500.woff2',
  './fonts/poppins-600.woff2',
  './fonts/poppins-700.woff2',
  './fonts/spacemono-400.woff2',
  './fonts/spacemono-700.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_VERSION; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var network = fetch(event.request).then(function (resp) {
        if (resp && resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(event.request, copy); });
        }
        return resp;
      }).catch(function () {
        // Sin red: si es una navegación, servir el shell principal.
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return cached;
      });
      // Cache-first: responde de una con lo cacheado si existe, y de fondo actualiza el cache.
      return cached || network;
    })
  );
});
