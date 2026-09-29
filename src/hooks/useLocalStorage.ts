import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from 'react'

type StoredJsonListener = (json: string) => void

const listenersByStorageKey = new Map<string, Set<StoredJsonListener>>()

export function useLocalStorage<T>(
  storageKey: string,
  initialValue: T,
  migrateStoredValue?: (parsedStoredValue: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [instanceValue, setInstanceValue] = useState<T>(() => {
    try {
      const storedJson = localStorage.getItem(storageKey)
      if (storedJson !== null) {
        const parsed = JSON.parse(storedJson)
        return migrateStoredValue ? migrateStoredValue(parsed) : (parsed as T)
      }
    } catch {}
    return initialValue
  })

  const ownListenerRef = useRef<StoredJsonListener>(null)

  useEffect(() => {
    const keyListeners = listenersByStorageKey.get(storageKey) ?? new Set()
    const applySyncedJson: StoredJsonListener = (json) => {
      try {
        setInstanceValue(JSON.parse(json) as T)
      } catch {}
    }
    ownListenerRef.current = applySyncedJson
    keyListeners.add(applySyncedJson)
    listenersByStorageKey.set(storageKey, keyListeners)
    return () => {
      keyListeners.delete(applySyncedJson)
      ownListenerRef.current = null
      if (keyListeners.size === 0) listenersByStorageKey.delete(storageKey)
    }
  }, [storageKey])

  const setStoredValue = useCallback(
    (nextValueOrUpdater: SetStateAction<T>) => {
      setInstanceValue((previousValue) => {
        const nextValue =
          typeof nextValueOrUpdater === 'function'
            ? (nextValueOrUpdater as (prev: T) => T)(previousValue)
            : nextValueOrUpdater
        try {
          const nextJson = JSON.stringify(nextValue)
          localStorage.setItem(storageKey, nextJson)
          const ownListener = ownListenerRef.current
          listenersByStorageKey.get(storageKey)?.forEach((listener) => {
            if (listener !== ownListener) listener(nextJson)
          })
        } catch {}
        return nextValue
      })
    },
    [storageKey],
  )

  return [instanceValue, setStoredValue]
}
