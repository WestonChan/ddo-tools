// Service worker for caching ddo.db (game database, ~11MB).
// Cache-first strategy: serve from cache if available, otherwise fetch and cache.
// Bump CACHE_NAME when the DB is rebuilt to invalidate stale caches.

const CACHE_NAME = 'ddo-db-v1'
const DB_URL_PATTERN = /\/data\/ddo\.db$/

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Clean up old caches when CACHE_NAME changes
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith('ddo-db-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (!DB_URL_PATTERN.test(event.request.url)) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
    })
  )
})
