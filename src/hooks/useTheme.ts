import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeApi {
  theme: Theme
  toggle: () => void
}

/** Mirrors the pre-React inline script in index.html, which applies
 *  `data-theme` before first paint to avoid a flash of the wrong theme.
 *  Keep the two in sync. They can still resolve differently — that script
 *  runs at page load, this runs on first read — which is why `ensureInit`
 *  re-applies the result rather than trusting the attribute. */
function getInitialTheme(): Theme {
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

// Module-level store rather than per-consumer `useState`. Theme is shared
// state: with `useState + useEffect`, every consumer held its own copy, so
// `toggle()` only updated the caller's — other consumers kept rendering the
// stale value until an unrelated re-render. `useSyncExternalStore` gives all
// consumers one source of truth plus a synchronous first-render read. Same
// shape as useDatabase / useModalActive; see docs/state-management.md.
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

// The single place `data-theme` is written. Every path that moves `_theme`
// goes through here, so the document can never report a different theme
// than the store — a divergence would strand the UI: Settings marks the
// active button from `theme` and only toggles when the value differs, so a
// store that disagreed with the page would show the wrong button as active
// and ignore clicks on the right one.
function applyTheme(next: Theme): void {
  _theme = next
  document.documentElement.setAttribute('data-theme', next)
}

// Resolves on first read rather than at module scope: reading
// localStorage/matchMedia at import time would snapshot them before tests
// (or any caller) can stage them. Idempotent kicker called from the hook
// body, mirroring `ensureLoad` in useDatabase — see docs/state-management.md.
//
// This re-applies `data-theme` even though index.html already set it at
// load, because the inputs can move in between: the OS light/dark schedule
// flips, or another tab toggles and writes localStorage, while this tab sits
// on a route with no theme consumer mounted. Deliberately does NOT persist —
// a preference the user never expressed shouldn't be latched into
// localStorage, so they keep following their OS until they pick a side.
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

// Module-level, so the reference is stable across renders for every consumer.
function toggle(): void {
  setTheme(ensureInit() === 'dark' ? 'light' : 'dark')
}

export function useTheme(): ThemeApi {
  ensureInit()
  const theme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { theme, toggle }
}

/** Test-only: drop the cached theme so the next read re-derives it from
 *  localStorage / matchMedia. Module state otherwise persists across vitest
 *  cases in the same file. */
export function _resetThemeForTests(): void {
  _theme = null
  notify()
}
