import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from 'react'

type Listener = (json: string) => void

const listeners = new Map<string, Set<Listener>>()

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
    } catch {}
    return initialValue
  })

  const listenerRef = useRef<Listener>(null)

  useEffect(() => {
    const set = listeners.get(key) ?? new Set()
    const handler: Listener = (json) => {
      try {
        setValue(JSON.parse(json) as T)
      } catch {}
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

  const setAndSync = useCallback(
    (action: SetStateAction<T>) => {
      setValue((prev) => {
        const next = typeof action === 'function' ? (action as (prev: T) => T)(prev) : action
        try {
          const json = JSON.stringify(next)
          localStorage.setItem(key, json)
          const self = listenerRef.current
          listeners.get(key)?.forEach((fn) => {
            if (fn !== self) fn(json)
          })
        } catch {}
        return next
      })
    },
    [key],
  )

  return [value, setAndSync]
}
