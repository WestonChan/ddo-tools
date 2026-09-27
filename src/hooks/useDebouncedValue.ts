import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), Math.max(delayMs, 0))
    return () => clearTimeout(handle)
  }, [value, delayMs])

  return debounced
}
