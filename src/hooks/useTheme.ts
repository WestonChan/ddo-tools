import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeApi {
  theme: Theme
  toggle: () => void
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

let _theme: Theme | null = null
const _listeners = new Set<() => void>()

function notify(): void {
  _listeners.forEach((fn) => fn())
}

function subscribe(listener: () => void): () => void {
  _listeners.add(listener)
  return () => {
    _listeners.delete(listener)
  }
}

function applyTheme(next: Theme): void {
  _theme = next
  document.documentElement.setAttribute('data-theme', next)
}

function ensureInit(): Theme {
  const current = _theme
  if (current !== null) return current
  const initial = getInitialTheme()
  applyTheme(initial)
  return initial
}

function getSnapshot(): Theme {
  return ensureInit()
}

function setTheme(next: Theme): void {
  applyTheme(next)
  localStorage.setItem('theme', next)
  notify()
}

function toggle(): void {
  setTheme(ensureInit() === 'dark' ? 'light' : 'dark')
}

export function useTheme(): ThemeApi {
  ensureInit()
  const theme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { theme, toggle }
}

export function _resetThemeForTests(): void {
  _theme = null
  notify()
}
