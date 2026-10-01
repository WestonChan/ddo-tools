import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme, resetThemeForTests } from './useTheme'
import { installMatchMedia, restoreMatchMedia, type MatchMediaStub } from '../test/matchMediaStub'
import { runPrePaintScript } from '../test/runPrePaintScript'

const PREFERS_LIGHT_QUERY = '(prefers-color-scheme: light)'

function stubOperatingSystemPrefersLight(isLightPreferred: boolean): MatchMediaStub {
  return installMatchMedia((query) => isLightPreferred && query === PREFERS_LIGHT_QUERY)
}

function documentTheme(): string | null {
  return document.documentElement.getAttribute('data-theme')
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  resetThemeForTests()
})

afterEach(() => {
  restoreMatchMedia()
})

describe('useTheme', () => {
  it('keeps a legacy stored light or dark as the explicit preference', () => {
    for (const storedTheme of ['light', 'dark'] as const) {
      resetThemeForTests()
      localStorage.setItem('theme', storedTheme)
      stubOperatingSystemPrefersLight(storedTheme === 'dark')

      const { result, unmount } = renderHook(() => useTheme())

      expect(result.current.themePreference).toBe(storedTheme)
      expect(result.current.theme).toBe(storedTheme)
      unmount()
    }
  })

  it('follows the OS when nothing valid is stored', () => {
    localStorage.setItem('theme', 'banana')
    stubOperatingSystemPrefersLight(true)

    const { result } = renderHook(() => useTheme())

    expect(result.current.themePreference).toBe('system')
    expect(result.current.theme).toBe('light')
    expect(documentTheme()).toBe('light')
  })

  it('re-resolves a system preference when the OS setting changes', () => {
    localStorage.setItem('theme', 'system')
    const matchMediaStub = stubOperatingSystemPrefersLight(false)
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')

    act(() => matchMediaStub.emitChange(PREFERS_LIGHT_QUERY, true))

    expect(result.current.theme).toBe('light')
    expect(documentTheme()).toBe('light')
    expect(result.current.themePreference).toBe('system')
  })

  it('applies an OS change made while nothing was subscribed once a consumer subscribes again', () => {
    localStorage.setItem('theme', 'system')
    const matchMediaStub = stubOperatingSystemPrefersLight(false)
    const firstConsumer = renderHook(() => useTheme())
    expect(firstConsumer.result.current.theme).toBe('dark')
    firstConsumer.unmount()

    matchMediaStub.emitChange(PREFERS_LIGHT_QUERY, true)
    const laterConsumer = renderHook(() => useTheme())

    expect(laterConsumer.result.current.theme).toBe('light')
    expect(documentTheme()).toBe('light')
  })

  it('ignores OS changes while an explicit preference is set', () => {
    const matchMediaStub = stubOperatingSystemPrefersLight(false)
    const { result } = renderHook(() => useTheme())

    act(() => result.current.setThemePreference('dark'))
    act(() => matchMediaStub.emitChange(PREFERS_LIGHT_QUERY, true))

    expect(result.current.theme).toBe('dark')
    expect(documentTheme()).toBe('dark')
  })

  it('stores the chosen preference and applies its resolved theme to the document', () => {
    stubOperatingSystemPrefersLight(true)
    const { result } = renderHook(() => useTheme())

    act(() => result.current.setThemePreference('dark'))
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(documentTheme()).toBe('dark')

    act(() => result.current.setThemePreference('system'))
    expect(localStorage.getItem('theme')).toBe('system')
    expect(result.current.theme).toBe('light')
    expect(documentTheme()).toBe('light')
  })

  it('forces the document to match the theme it resolves on first read', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    stubOperatingSystemPrefersLight(true)

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('light')
    expect(documentTheme()).toBe('light')
  })

  it('propagates a preference change from one consumer to every other consumer', () => {
    stubOperatingSystemPrefersLight(false)
    const choosingConsumer = renderHook(() => useTheme())
    const observingConsumer = renderHook(() => useTheme())
    expect(observingConsumer.result.current.theme).toBe('dark')

    act(() => choosingConsumer.result.current.setThemePreference('light'))

    expect(observingConsumer.result.current.theme).toBe('light')
    expect(observingConsumer.result.current.themePreference).toBe('light')
  })

  it('stops listening to the OS once the last consumer unmounts', () => {
    const matchMediaStub = stubOperatingSystemPrefersLight(false)
    const firstConsumer = renderHook(() => useTheme())
    const secondConsumer = renderHook(() => useTheme())
    const osQuery = matchMediaStub.stubbedMediaQueryFor(PREFERS_LIGHT_QUERY)
    expect(osQuery.changeListeners.size).toBe(1)

    firstConsumer.unmount()
    expect(osQuery.changeListeners.size).toBe(1)
    secondConsumer.unmount()
    expect(osQuery.changeListeners.size).toBe(0)
  })
})

describe('index.html pre-paint script', () => {
  it('resolves the same theme as useTheme for every stored preference and OS setting', () => {
    for (const storedText of [null, 'dark', 'light', 'system', 'banana']) {
      for (const isLightPreferred of [false, true]) {
        localStorage.clear()
        if (storedText !== null) localStorage.setItem('theme', storedText)
        stubOperatingSystemPrefersLight(isLightPreferred)
        resetThemeForTests()
        const { result, unmount } = renderHook(() => useTheme())
        const hookTheme = result.current.theme
        unmount()

        document.documentElement.removeAttribute('data-theme')
        runPrePaintScript()

        expect(documentTheme(), `stored ${storedText}, OS light ${isLightPreferred}`).toBe(
          hookTheme,
        )
      }
    }
  })
})
