// Service worker for caching ddo.db (game database, ~11MB).
// Cache-first strategy: serve from cache if available, otherwise fetch and cache.
// Bump CACHE_NAME when the DB is rebuilt to invalidate stale caches.

// v2: quest_loot.loot_type column added (raid loot tagging).
const CACHE_NAME = 'ddo-db-v2'
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
  // Same-origin check matters even though the path pattern looks specific:
  // any same-scope page fetching a cross-origin .../data/ddo.db would
  // otherwise be intercepted and its (opaque) response considered.
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (!DB_URL_PATTERN.test(url.pathname)) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          // waitUntil keeps the worker alive for the ~11MB write. Without
          // it the browser may terminate the worker after respondWith
          // settles, silently aborting the put — the DB would then be
          // re-downloaded on every visit with no visible error.
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          )
        }
        return response
      })
    })
  )
})
