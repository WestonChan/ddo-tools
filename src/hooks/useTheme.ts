import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeControls {
  theme: Theme
  toggleTheme: () => void
}

function storedOrSystemTheme(): Theme {
  const storedTheme = localStorage.getItem('theme')
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

let currentTheme: Theme | null = null
const themeListeners = new Set<() => void>()

function notifyThemeListeners(): void {
  themeListeners.forEach((fn) => fn())
}

function subscribeToTheme(listener: () => void): () => void {
  themeListeners.add(listener)
  return () => {
    themeListeners.delete(listener)
  }
}

function applyTheme(nextTheme: Theme): void {
  currentTheme = nextTheme
  document.documentElement.setAttribute('data-theme', nextTheme)
}

function ensureThemeInitialized(): Theme {
  const current = currentTheme
  if (current !== null) return current
  const initial = storedOrSystemTheme()
  applyTheme(initial)
  return initial
}

function themeSnapshot(): Theme {
  return ensureThemeInitialized()
}

function setTheme(nextTheme: Theme): void {
  applyTheme(nextTheme)
  localStorage.setItem('theme', nextTheme)
  notifyThemeListeners()
}

function toggleTheme(): void {
  setTheme(ensureThemeInitialized() === 'dark' ? 'light' : 'dark')
}

export function useTheme(): ThemeControls {
  ensureThemeInitialized()
  const theme = useSyncExternalStore(subscribeToTheme, themeSnapshot, themeSnapshot)
  return { theme, toggleTheme }
}

export function resetThemeForTests(): void {
  currentTheme = null
  notifyThemeListeners()
}
