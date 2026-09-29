import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedValue } from './useDebouncedValue'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 100))
    expect(result.current).toBe('a')
  })

  it('holds the old value until the delay elapses', () => {
    const { result, rerender } = renderHook(({ v: latestValue }) => useDebouncedValue(latestValue, 100), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'b' })
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(99)
    })
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('b')
  })

  it('restarts the window on every change — only the final value commits', () => {
    const { result, rerender } = renderHook(({ v: latestValue }) => useDebouncedValue(latestValue, 100), {
      initialProps: { v: '' },
    })
    for (const v of ['f', 'fo', 'for', 'forc', 'force']) {
      rerender({ v })
      act(() => {
        vi.advanceTimersByTime(50)
      })
    }
    expect(result.current).toBe('')

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe('force')
  })

  it('clamps a negative delay to zero instead of breaking setTimeout', () => {
    const { result, rerender } = renderHook(({ v: latestValue }) => useDebouncedValue(latestValue, -50), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'b' })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe('b')
  })

  it('cancels the pending commit on unmount', () => {
    const { rerender, unmount } = renderHook(({ v: latestValue }) => useDebouncedValue(latestValue, 100), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'b' })
    unmount()
    expect(() => vi.runAllTimers()).not.toThrow()
  })
})
