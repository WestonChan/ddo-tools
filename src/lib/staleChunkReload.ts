import { createPersistedValueFamily } from './persistedState'

const RELOADED_CHUNK_STORAGE_KEY_PREFIX = 'ddo-stale-chunk-reload:'

interface VitePreloadErrorEvent extends Event {
  payload?: unknown
}

const reloadedChunkStore = createPersistedValueFamily<string, boolean>({
  storageArea: 'sessionStorage',
  storageKeyFor: (failureMessage) => RELOADED_CHUNK_STORAGE_KEY_PREFIX + failureMessage,
  codec: 'json',
  defaultValue: false,
  validatedValue: (candidate) => candidate === true || undefined,
})

function reloadOnceForChunk(event: VitePreloadErrorEvent): void {
  const failureMessage = event.payload instanceof Error ? event.payload.message : 'unknown'
  const reloadedChunkState = reloadedChunkStore(failureMessage)
  if (reloadedChunkState.snapshot()) return
  if (!reloadedChunkState.save(true)) return
  window.location.reload()
}

export function reloadOnStaleChunk(): () => void {
  window.addEventListener('vite:preloadError', reloadOnceForChunk)
  return () => window.removeEventListener('vite:preloadError', reloadOnceForChunk)
}
