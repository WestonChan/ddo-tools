// Wipe SW caches (covers a corrupt or stale cached ddo.db) + unregister
// service workers, then reload. Used by DatabaseGate's "Clear Cached Game
// Data & Retry" button and by its automatic schema-error self-heal.
//
// The deletions are awaited BEFORE the reload — previously they were
// fire-and-forget, so the reload could win the race and the stale cache
// would survive the "clear". For the one-shot self-heal that race would be
// fatal: the guard blocks a second attempt, so a surviving cache would
// strand the user on the error screen. `finally` keeps the reload
// unconditional — even if cache deletion throws, reloading is still the
// best available move.
export async function clearSiteData(): Promise<void> {
  try {
    if ('caches' in window) {
      const names = await caches.keys()
      await Promise.all(names.map((n) => caches.delete(n)))
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    sessionStorage.removeItem('ddo-db-retry-count')
  } finally {
    window.location.reload()
  }
}
