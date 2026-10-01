import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
  captureException: vi.fn(),
  lastEventId: vi.fn(() => undefined),
  getReplay: vi.fn(() => undefined),
}))

if (
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage.getItem !== 'function'
) {
  const storedValuesByKey: Record<string, string> = {}
  globalThis.localStorage = {
    getItem: (key: string) => storedValuesByKey[key] ?? null,
    setItem: (key: string, value: string) => {
      storedValuesByKey[key] = value
    },
    removeItem: (key: string) => {
      delete storedValuesByKey[key]
    },
    clear: () => {
      for (const k in storedValuesByKey) delete storedValuesByKey[k]
    },
    get length() {
      return Object.keys(storedValuesByKey).length
    },
    key: (i: number) => Object.keys(storedValuesByKey)[i] ?? null,
  }
}

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

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class {
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds = []
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }
}
