import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery } from './useMediaQuery'
import { installMatchMedia, restoreMatchMedia, type MatchMediaStub } from '../test/matchMediaStub'

let matchMediaStub: MatchMediaStub

afterEach(restoreMatchMedia)

describe('useMediaQuery', () => {
  beforeEach(() => {
    matchMediaStub = installMatchMedia(false)
  })

  it('reports the current match state on first render', () => {
    matchMediaStub = installMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery('(max-width: 599px)'))
    expect(result.current).toBe(true)
  })

  it('re-renders when the query starts matching', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 599px)'))
    expect(result.current).toBe(false)

    act(() => matchMediaStub.emitChange('(max-width: 599px)', true))

    expect(result.current).toBe(true)
  })

  it('drops its change listener on unmount', () => {
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 599px)'))
    const stubbedQueryState = matchMediaStub.stubbedMediaQueryFor('(max-width: 599px)')
    expect(stubbedQueryState.changeListeners.size).toBe(1)

    unmount()

    expect(stubbedQueryState.changeListeners.size).toBe(0)
    expect(stubbedQueryState.removedListenerCount).toBeGreaterThan(0)
  })
})
