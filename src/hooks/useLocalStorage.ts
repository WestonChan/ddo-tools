import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from 'react'

type Listener = (json: string) => void

/** Module-level subscribers keyed by localStorage key. */
const listeners = new Map<string, Set<Listener>>()

/**
 * Drop-in replacement for useState that persists to localStorage.
 * Multiple hook instances sharing the same key stay in sync within the same tab.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  migrate?: (value: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        const parsed = JSON.parse(stored)
        return migrate ? migrate(parsed) : (parsed as T)
      }
    } catch {
      // corrupt data — fall back
    }
    return initialValue
  })

  // Track this instance's listener so setAndSync can skip self-notification
  const listenerRef = useRef<Listener>(null)

  // Subscribe to writes from other hook instances sharing this key
  useEffect(() => {
    const set = listeners.get(key) ?? new Set()
    const handler: Listener = (json) => {
      try {
        setValue(JSON.parse(json) as T)
      } catch {
        // ignore parse errors
      }
    }
    listenerRef.current = handler
    set.add(handler)
    listeners.set(key, set)
    return () => {
      set.delete(handler)
      listenerRef.current = null
      if (set.size === 0) listeners.delete(key)
    }
  }, [key])

  // Setter that writes to localStorage and notifies sibling instances
  const setAndSync = useCallback(
    (action: SetStateAction<T>) => {
      setValue((prev) => {
        const next = typeof action === 'function' ? (action as (prev: T) => T)(prev) : action
        try {
          const json = JSON.stringify(next)
          localStorage.setItem(key, json)
          // Notify other instances, skip self
          const self = listenerRef.current
          listeners.get(key)?.forEach((fn) => {
            if (fn !== self) fn(json)
          })
        } catch {
          // storage full or unavailable
        }
        return next
      })
    },
    [key],
  )

  return [value, setAndSync]
}
