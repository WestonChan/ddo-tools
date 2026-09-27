import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme, _resetThemeForTests } from './useTheme'

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
    stubPrefersLight(false)
    const settings = renderHook(() => useTheme())
    const observer = renderHook(() => useTheme())
    expect(observer.result.current.theme).toBe('dark')

    act(() => settings.result.current.toggle())

    expect(settings.result.current.theme).toBe('light')
    expect(observer.result.current.theme).toBe('light')
  })
})
