import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'
export type ThemePreference = Theme | 'system'

interface ThemeState {
  theme: Theme
  themePreference: ThemePreference
}

interface ThemeControls extends ThemeState {
  setThemePreference: (nextPreference: ThemePreference) => void
}

const THEME_STORAGE_KEY = 'theme'
const PREFERS_LIGHT_QUERY = '(prefers-color-scheme: light)'

function isThemePreference(storedText: string | null): storedText is ThemePreference {
  return storedText === 'light' || storedText === 'dark' || storedText === 'system'
}

function storedThemePreference(): ThemePreference {
  try {
    const storedText = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(storedText) ? storedText : 'system'
  } catch {
    return 'system'
  }
}

function saveThemePreference(themePreference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themePreference)
  } catch {
    return
  }
}

function operatingSystemTheme(): Theme {
  return window.matchMedia(PREFERS_LIGHT_QUERY).matches ? 'light' : 'dark'
}

function resolvedTheme(themePreference: ThemePreference): Theme {
  return themePreference === 'system' ? operatingSystemTheme() : themePreference
}

let currentThemeState: ThemeState | null = null
const themeListeners = new Set<() => void>()
let subscribedOperatingSystemQuery: MediaQueryList | null = null

function notifyThemeListeners(): void {
  themeListeners.forEach((listener) => listener())
}

function applyThemePreference(themePreference: ThemePreference): ThemeState {
  const nextThemeState = { theme: resolvedTheme(themePreference), themePreference }
  currentThemeState = nextThemeState
  document.documentElement.setAttribute('data-theme', nextThemeState.theme)
  return nextThemeState
}

function ensureThemeInitialized(): ThemeState {
  return currentThemeState ?? applyThemePreference(storedThemePreference())
}

function followOperatingSystemChange(): void {
  const themeState = ensureThemeInitialized()
  if (themeState.themePreference !== 'system') return
  if (resolvedTheme('system') === themeState.theme) return
  applyThemePreference('system')
  notifyThemeListeners()
}

function subscribeToTheme(listener: () => void): () => void {
  themeListeners.add(listener)
  if (!subscribedOperatingSystemQuery) {
    subscribedOperatingSystemQuery = window.matchMedia(PREFERS_LIGHT_QUERY)
    subscribedOperatingSystemQuery.addEventListener('change', followOperatingSystemChange)
    followOperatingSystemChange()
  }
  return () => {
    themeListeners.delete(listener)
    if (themeListeners.size === 0) stopFollowingOperatingSystem()
  }
}

function stopFollowingOperatingSystem(): void {
  subscribedOperatingSystemQuery?.removeEventListener('change', followOperatingSystemChange)
  subscribedOperatingSystemQuery = null
}

function setThemePreference(nextPreference: ThemePreference): void {
  applyThemePreference(nextPreference)
  saveThemePreference(nextPreference)
  notifyThemeListeners()
}

export function useTheme(): ThemeControls {
  const themeState = useSyncExternalStore(
    subscribeToTheme,
    ensureThemeInitialized,
    ensureThemeInitialized,
  )
  return { ...themeState, setThemePreference }
}

export function resetThemeForTests(): void {
  currentThemeState = null
  notifyThemeListeners()
}
