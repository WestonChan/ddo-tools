import { useEffect, useState } from 'react'

// Returns a value that lags the input by `delayMs`. Unlike React's
// `useDeferredValue` (which only buys one frame of priority and offers no real
// debounce against synchronous work), this defers commits until the input has
// been stable for the full delay window. Used for search inputs against
// synchronous query layers (sql.js / Fuse.js) where a key-by-key re-index
// would jank the UI.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), Math.max(delayMs, 0))
    return () => clearTimeout(handle)
  }, [value, delayMs])

  return debounced
}
