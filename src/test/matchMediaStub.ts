
type ChangeListener = (event: MediaQueryListEvent) => void

export interface StubbedQuery {
  matches: boolean
  listeners: Set<ChangeListener>
  removed: number
}

export interface MatchMediaStub {
  stateFor(query: string): StubbedQuery
  emitChange(query: string, matches: boolean): void
  restore(): void
}

let active: MatchMediaStub | null = null

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

export function restoreMatchMedia(): void {
  active?.restore()
  active = null
}
