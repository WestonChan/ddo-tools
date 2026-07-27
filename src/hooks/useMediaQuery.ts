import { useCallback, useSyncExternalStore } from 'react'

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 *
 * `matchMedia` is exactly the shape `useSyncExternalStore` exists for: an
 * external source with its own change notifications, read by components that
 * must see the *current* value on first render. A `useState + useEffect`
 * version would render `false` for one frame on every mount and then correct
 * itself — visible as a flash whenever the initial branch differs (see
 * docs/state-management.md). There's no module-level store here because the
 * browser already owns the state; each query gets its own MediaQueryList.
 *
 * Use it for behavior that has to change with the viewport (which dismissal
 * gesture applies, whether an overlay traps focus). Pure styling stays in
 * CSS media queries — but when JS and CSS branch on the same breakpoint,
 * comment the coupling on both sides so they move together.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onStoreChange)
      return () => mql.removeEventListener('change', onStoreChange)
    },
    [query],
  )

  const getSnapshot = useCallback((): boolean => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
