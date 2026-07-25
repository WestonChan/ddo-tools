import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Stub @sentry/react across every test. Without this, jsdom emits noisy
// warnings about missing browser APIs (sendBeacon etc.) and tests that
// transitively import Sentry-using code can't easily assert capture calls.
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
  captureException: vi.fn(),
  lastEventId: vi.fn(() => undefined),
  getReplay: vi.fn(() => undefined),
}))

// jsdom doesn't provide localStorage or matchMedia — stub them for tests
if (
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage.getItem !== 'function'
) {
  const store: Record<string, string> = {}
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      for (const k in store) delete store[k]
    },
    get length() {
      return Object.keys(store).length
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }
}

// jsdom has no ResizeObserver. react-window's <List> constructs one on mount
// to track its container, so any test rendering a virtualized list throws
// without this. The stub is inert — jsdom has no layout engine, so a real
// implementation would only ever report zeros anyway. Row-level rendering is
// covered by unit tests on the row component; assert real virtualization
// behavior in Playwright, per docs/testing.md.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
