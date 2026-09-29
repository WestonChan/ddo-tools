type MediaQueryChangeListener = (event: MediaQueryListEvent) => void

export interface StubbedMediaQuery {
  matches: boolean
  changeListeners: Set<MediaQueryChangeListener>
  removedListenerCount: number
}

export interface MatchMediaStub {
  stubbedMediaQueryFor(query: string): StubbedMediaQuery
  emitChange(query: string, matches: boolean): void
  restore(): void
}

let installedStub: MatchMediaStub | null = null

export function installMatchMedia(
  initialMatches: boolean | ((query: string) => boolean),
): MatchMediaStub {
  restoreMatchMedia()
  const originalMatchMedia = window.matchMedia
  const stubbedMediaQueriesByQuery = new Map<string, StubbedMediaQuery>()
  const initialMatchesFor =
    typeof initialMatches === 'function' ? initialMatches : (): boolean => initialMatches

  function stubbedMediaQueryFor(query: string): StubbedMediaQuery {
    const existing = stubbedMediaQueriesByQuery.get(query)
    if (existing) return existing
    const created: StubbedMediaQuery = {
      matches: initialMatchesFor(query),
      changeListeners: new Set(),
      removedListenerCount: 0,
    }
    stubbedMediaQueriesByQuery.set(query, created)
    return created
  }

  window.matchMedia = ((query: string) => {
    const stubbedMediaQuery = stubbedMediaQueryFor(query)
    return {
      get matches(): boolean {
        return stubbedMediaQuery.matches
      },
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_type: string, listener: MediaQueryChangeListener) => {
        stubbedMediaQuery.changeListeners.add(listener)
      },
      removeEventListener: (_type: string, listener: MediaQueryChangeListener) => {
        stubbedMediaQuery.changeListeners.delete(listener)
        stubbedMediaQuery.removedListenerCount += 1
      },
      dispatchEvent: () => false,
    }
  }) as unknown as typeof window.matchMedia

  const stub: MatchMediaStub = {
    stubbedMediaQueryFor,
    emitChange(query, matches) {
      const state = stubbedMediaQueryFor(query)
      state.matches = matches
      state.changeListeners.forEach((listener) =>
        listener({ matches, media: query } as MediaQueryListEvent),
      )
    },
    restore() {
      window.matchMedia = originalMatchMedia
      stubbedMediaQueriesByQuery.clear()
      if (installedStub === stub) installedStub = null
    },
  }
  installedStub = stub
  return stub
}

export function restoreMatchMedia(): void {
  installedStub?.restore()
  installedStub = null
}
