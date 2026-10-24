import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reloadOnStaleChunk } from './staleChunkReload'

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
    sessionStorage.clear()
    reload.mockClear()
    vi.stubGlobal('location', { ...window.location, reload })
    stopReloading = reloadOnStaleChunk()
  })

  afterEach(() => {
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
})
