import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reloadOnStaleChunk } from './staleChunkReload'
import { resetPersistedStateForTests } from './persistedState'

function dispatchPreloadError(message: string): Event {
  const event = Object.assign(new Event('vite:preloadError', { cancelable: true }), {
    payload: new Error(message),
  })
  window.dispatchEvent(event)
  return event
}

describe('reloadOnStaleChunk', () => {
  const reload = vi.fn()
  let stopReloading: () => void

  beforeEach(() => {
    reload.mockClear()
    vi.stubGlobal('location', { ...window.location, reload })
    stopReloading = reloadOnStaleChunk()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    stopReloading()
    vi.unstubAllGlobals()
  })

  it('reloads the page when a chunk from an earlier deploy fails to load', () => {
    dispatchPreloadError('Unable to preload CSS for /assets/lazyViews-old.css')
    expect(reload).toHaveBeenCalledOnce()
  })

  it('reloads only once for the same missing chunk, so a truly missing file surfaces its error', () => {
    dispatchPreloadError('Unable to preload CSS for /assets/lazyViews-old.css')
    dispatchPreloadError('Unable to preload CSS for /assets/lazyViews-old.css')
    expect(reload).toHaveBeenCalledOnce()
  })

  it('never swallows the error, so the view still fails visibly if the reload is skipped', () => {
    const event = dispatchPreloadError('Unable to preload CSS for /assets/lazyViews-old.css')
    expect(event.defaultPrevented).toBe(false)
  })

  it('reloads only once across the reload itself, which keeps its sessionStorage', () => {
    dispatchPreloadError('Unable to preload CSS for /assets/lazyViews-old.css')
    resetPersistedStateForTests()
    dispatchPreloadError('Unable to preload CSS for /assets/lazyViews-old.css')
    expect(reload).toHaveBeenCalledOnce()
  })

  it('does not reload when sessionStorage refuses the flag, so a blocked store cannot loop', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    dispatchPreloadError('Unable to preload CSS for /assets/lazyViews-old.css')
    expect(reload).not.toHaveBeenCalled()
  })

  it('does not reload when the sessionStorage global itself throws', () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    dispatchPreloadError('Unable to preload CSS for /assets/lazyViews-old.css')
    expect(reload).not.toHaveBeenCalled()
  })
})
