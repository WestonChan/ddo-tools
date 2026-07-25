import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme, _resetThemeForTests } from './useTheme'

// src/test/setup.ts installs a matchMedia stub that always reports
// `matches: false`. Swap it per-test to exercise the system-preference
// branch, then put the shared stub back.
const defaultMatchMedia = window.matchMedia

function stubPrefersLight(prefersLight: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: prefersLight && query.includes('prefers-color-scheme: light'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

beforeEach(() => {
  // Inputs first, store last: dropping the cached theme notifies live
  // subscribers, which immediately re-derive from localStorage / matchMedia.
  // Reset before clearing and they'd re-derive from the previous case's
  // state. Moot while RTL auto-cleanup unmounts everything between cases,
  // but this ordering is what makes a mid-test reset safe.
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  _resetThemeForTests()
})

afterEach(() => {
  window.matchMedia = defaultMatchMedia
})

describe('useTheme', () => {
  it('prefers a valid stored theme over the system preference', () => {
    localStorage.setItem('theme', 'light')
    stubPrefersLight(false)

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('light')
  })

  it('falls back to the system preference when no valid theme is stored', () => {
    localStorage.setItem('theme', 'banana')
    stubPrefersLight(true)

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('light')
  })

  it('defaults to dark when nothing is stored and the system prefers dark', () => {
    stubPrefersLight(false)

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('dark')
  })

  it('forces the document to match the theme it resolves on first read', () => {
    // index.html's pre-paint script applied `dark` at load, then the inputs
    // moved before anything read the store — the OS switched to light, or
    // another tab toggled and wrote localStorage. The store must drag the
    // document to whatever it resolves, or it reports a theme the page isn't
    // rendering: Settings would mark the wrong button active, and clicking
    // the right one is a no-op because it only toggles when the value
    // differs.
    document.documentElement.setAttribute('data-theme', 'dark')
    stubPrefersLight(true)

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('toggle() flips the theme and syncs the DOM attribute and localStorage', () => {
    stubPrefersLight(false)
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')

    act(() => result.current.toggle())

    expect(result.current.theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('propagates a toggle from one consumer to every other consumer', () => {
    // The reason this hook is an external store rather than per-consumer
    // useState: theme is shared, so a write from the settings toggle has to
    // be visible to any other component reading `theme` without waiting for
    // an unrelated re-render.
    stubPrefersLight(false)
    const settings = renderHook(() => useTheme())
    const observer = renderHook(() => useTheme())
    expect(observer.result.current.theme).toBe('dark')

    act(() => settings.result.current.toggle())

    expect(settings.result.current.theme).toBe('light')
    expect(observer.result.current.theme).toBe('light')
  })
})
