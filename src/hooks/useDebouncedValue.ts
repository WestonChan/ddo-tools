import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(latestValue: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(latestValue)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(latestValue), Math.max(delayMs, 0))
    return () => clearTimeout(timeoutId)
  }, [latestValue, delayMs])

  return debouncedValue
}
