import { useSyncExternalStore } from 'react'
import { createPersistedValue, resetPersistedStateForTests } from '../lib/persistedState'

export type Theme = 'dark' | 'light'
export type ThemePreference = Theme | 'system'

interface ThemeState {
  theme: Theme
  themePreference: ThemePreference
}

interface ThemeControls extends ThemeState {
  setThemePreference: (nextPreference: ThemePreference) => void
}

const PREFERS_LIGHT_QUERY = '(prefers-color-scheme: light)'

function isThemePreference(candidate: unknown): candidate is ThemePreference {
  return candidate === 'light' || candidate === 'dark' || candidate === 'system'
}

const themePreferenceStore = createPersistedValue<ThemePreference>({
  storageArea: 'localStorage',
  storageKey: 'theme',
  codec: 'text',
  defaultValue: 'system',
  validatedValue: (candidate) => (isThemePreference(candidate) ? candidate : undefined),
})

function storedThemePreference(): ThemePreference {
  return themePreferenceStore.snapshot()
}

function saveThemePreference(themePreference: ThemePreference): void {
  themePreferenceStore.save(themePreference)
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
  resetPersistedStateForTests()
  notifyThemeListeners()
}
