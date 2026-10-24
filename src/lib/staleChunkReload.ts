const RELOADED_CHUNK_STORAGE_KEY_PREFIX = 'ddo-stale-chunk-reload:'

interface VitePreloadErrorEvent extends Event {
  payload?: unknown
}

function reloadOnceForChunk(event: VitePreloadErrorEvent): void {
  const failureMessage = event.payload instanceof Error ? event.payload.message : 'unknown'
  const storageKey = RELOADED_CHUNK_STORAGE_KEY_PREFIX + failureMessage
  try {
    if (sessionStorage.getItem(storageKey)) return
    sessionStorage.setItem(storageKey, '1')
  } catch {
    return
  }
  window.location.reload()
}

export function reloadOnStaleChunk(): () => void {
  window.addEventListener('vite:preloadError', reloadOnceForChunk)
  return () => window.removeEventListener('vite:preloadError', reloadOnceForChunk)
}
