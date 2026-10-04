import { useState } from 'react'

type RovingKey = string | number
type RovingDirection = 'horizontal' | 'vertical'

interface RovingGroupOptions<Key extends RovingKey> {
  keys: readonly Key[]
  preferredKey?: Key | null
  direction: RovingDirection
  focusItem: (key: Key) => void
  isWrapping?: boolean
}

export function useRovingGroup<Key extends RovingKey>({
  keys,
  preferredKey,
  direction,
  focusItem,
  isWrapping = false,
}: RovingGroupOptions<Key>): {
  tabStopKey: Key | undefined
  rememberFocus: (key: Key) => void
  focusKey: (key: Key) => void
  moveFocus: (key: Key, pressedKey: string, pageSize?: number) => boolean
} {
  const [lastFocusedKey, setLastFocusedKey] = useState<Key | null>(null)
  const tabStopKey =
    preferredKey != null && keys.includes(preferredKey)
      ? preferredKey
      : lastFocusedKey != null && keys.includes(lastFocusedKey)
        ? lastFocusedKey
        : keys[0]

  function rememberFocus(key: Key): void {
    setLastFocusedKey(key)
  }

  function focusKey(key: Key): void {
    if (!keys.includes(key)) return
    setLastFocusedKey(key)
    focusItem(key)
  }

  function moveFocus(key: Key, pressedKey: string, pageSize = 1): boolean {
    const currentIndex = keys.indexOf(key)
    if (currentIndex < 0) return false
    const previousKey = direction === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
    const nextKey = direction === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
    const offset =
      pressedKey === previousKey || (direction === 'vertical' && pressedKey === 'PageUp')
        ? -1
        : pressedKey === nextKey || (direction === 'vertical' && pressedKey === 'PageDown')
          ? 1
          : 0
    const isPageKey = pressedKey === 'PageUp' || pressedKey === 'PageDown'
    if (pressedKey !== 'Home' && pressedKey !== 'End' && offset === 0) return false
    const unboundedIndex =
      pressedKey === 'Home'
        ? 0
        : pressedKey === 'End'
          ? keys.length - 1
          : currentIndex + offset * (isPageKey ? Math.max(1, pageSize) : 1)
    const nextIndex = isWrapping
      ? (unboundedIndex + keys.length) % keys.length
      : Math.max(0, Math.min(keys.length - 1, unboundedIndex))
    if (nextIndex !== currentIndex) focusKey(keys[nextIndex])
    return true
  }

  return { tabStopKey, rememberFocus, focusKey, moveFocus }
}
