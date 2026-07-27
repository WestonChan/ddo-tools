import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery } from './useMediaQuery'
import { installMatchMedia, restoreMatchMedia, type MatchMediaStub } from '../test/matchMediaStub'

// src/test/setup.ts installs a matchMedia stub that always reports
// `matches: false` and swallows listeners. Swap in the controllable one per
// test, then restore the shared stub.
let matchMedia: MatchMediaStub

afterEach(restoreMatchMedia)

describe('useMediaQuery', () => {
  beforeEach(() => {
    matchMedia = installMatchMedia(false)
  })

  it('reports the current match state on first render', () => {
    matchMedia = installMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery('(max-width: 599px)'))
    expect(result.current).toBe(true)
  })

  it('re-renders when the query starts matching', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 599px)'))
    expect(result.current).toBe(false)

    act(() => matchMedia.emitChange('(max-width: 599px)', true))

    expect(result.current).toBe(true)
  })

  it('drops its change listener on unmount', () => {
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 599px)'))
    const state = matchMedia.stateFor('(max-width: 599px)')
    expect(state.listeners.size).toBe(1)

    unmount()

    expect(state.listeners.size).toBe(0)
    expect(state.removed).toBeGreaterThan(0)
  })
})
