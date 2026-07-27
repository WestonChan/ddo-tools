/**
 * Controllable `window.matchMedia` stub for tests.
 *
 * src/test/setup.ts installs a permanently-`false`, listener-swallowing stub so
 * jsdom doesn't throw on the call. That's enough for components that only read
 * a query once, but not for anything that has to *react* to a breakpoint
 * crossing (useMediaQuery, AppLayout's mobile nav overlay) — those need a stub
 * that both reports a starting value and can emit a `change`.
 *
 * The bookkeeping is per query string, and shared between every MediaQueryList
 * handed out for that string, because that's how the real API behaves: the
 * object `useMediaQuery` subscribes through and the one it reads `matches` from
 * are separate objects that must agree. State is created on first use and only
 * moves via `emitChange` — re-reading a query must never reset it.
 */

type ChangeListener = (event: MediaQueryListEvent) => void

export interface StubbedQuery {
  matches: boolean
  listeners: Set<ChangeListener>
  /** Count of `removeEventListener` calls — proves teardown ran even though
   *  the listener set is empty either way. */
  removed: number
}

export interface MatchMediaStub {
  /** Bookkeeping for one query string, created on first access. */
  stateFor(query: string): StubbedQuery
  /** Flip a query's match state and notify its subscribers. Wrap in `act()`
   *  when a React tree is subscribed. */
  emitChange(query: string, matches: boolean): void
  /** Put back whatever `window.matchMedia` was before this stub. */
  restore(): void
}

// Module-level so `installMatchMedia` can tear down a stub installed earlier in
// the same file (a `beforeEach` install followed by a per-case override) before
// capturing `previous`. Without it, the second install would capture the first
// stub as "previous" and restoring would leak it into later tests.
let active: MatchMediaStub | null = null

/**
 * Installs the stub on `window.matchMedia`.
 *
 * `initial` is either a flat answer for every query or a predicate, for tests
 * that care about one specific query and want everything else to report false.
 */
export function installMatchMedia(initial: boolean | ((query: string) => boolean)): MatchMediaStub {
  restoreMatchMedia()
  const previous = window.matchMedia
  const queries = new Map<string, StubbedQuery>()
  const initialFor = typeof initial === 'function' ? initial : (): boolean => initial

  function stateFor(query: string): StubbedQuery {
    const existing = queries.get(query)
    if (existing) return existing
    const created: StubbedQuery = { matches: initialFor(query), listeners: new Set(), removed: 0 }
    queries.set(query, created)
    return created
  }

  window.matchMedia = ((query: string) => {
    const state = stateFor(query)
    return {
      get matches(): boolean {
        return state.matches
      },
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_type: string, listener: ChangeListener) => {
        state.listeners.add(listener)
      },
      removeEventListener: (_type: string, listener: ChangeListener) => {
        state.listeners.delete(listener)
        state.removed += 1
      },
      dispatchEvent: () => false,
    }
  }) as unknown as typeof window.matchMedia

  const stub: MatchMediaStub = {
    stateFor,
    emitChange(query, matches) {
      const state = stateFor(query)
      state.matches = matches
      state.listeners.forEach((listener) =>
        listener({ matches, media: query } as MediaQueryListEvent),
      )
    },
    restore() {
      window.matchMedia = previous
      queries.clear()
      if (active === stub) active = null
    },
  }
  active = stub
  return stub
}

/** Restores the shared setup.ts stub. Safe to call unconditionally from
 *  `afterEach`, whether or not a test installed anything. */
export function restoreMatchMedia(): void {
  active?.restore()
  active = null
}
