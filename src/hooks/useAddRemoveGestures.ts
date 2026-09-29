import { useCallback, useEffect, useRef, type RefObject } from 'react'
import type { MouseEvent } from 'react'

interface AddRemoveGestureProps {
  ref: RefObject<HTMLElement | null>
  onClick: () => void
  onContextMenu: (e: MouseEvent) => void
}

export function useAddRemoveGestures(
  onAdd: () => void,
  onRemove: () => void,
  longPressDelayMs = 500,
): AddRemoveGestureProps {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLongPressFiredRef = useRef(false)
  const pressTargetRef = useRef<HTMLElement | null>(null)

  const latestOnAddRef = useRef(onAdd)
  const latestOnRemoveRef = useRef(onRemove)
  useEffect(() => {
    latestOnAddRef.current = onAdd
    latestOnRemoveRef.current = onRemove
  })

  const startLongPressTimer = useCallback(
    (e: TouchEvent) => {
      e.preventDefault()
      hasLongPressFiredRef.current = false
      longPressTimerRef.current = setTimeout(() => {
        hasLongPressFiredRef.current = true
        latestOnRemoveRef.current()
      }, longPressDelayMs)
    },
    [longPressDelayMs],
  )

  const addIfShortTap = useCallback(() => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    if (!hasLongPressFiredRef.current) latestOnAddRef.current()
  }, [])

  const cancelLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
  }, [])

  useEffect(() => {
    const pressTarget = pressTargetRef.current
    if (!pressTarget) return

    pressTarget.addEventListener('touchstart', startLongPressTimer, { passive: false })
    pressTarget.addEventListener('touchend', addIfShortTap)
    pressTarget.addEventListener('touchcancel', cancelLongPressTimer)

    return () => {
      pressTarget.removeEventListener('touchstart', startLongPressTimer)
      pressTarget.removeEventListener('touchend', addIfShortTap)
      pressTarget.removeEventListener('touchcancel', cancelLongPressTimer)
    }
  }, [startLongPressTimer, addIfShortTap, cancelLongPressTimer])

  const onClick = useCallback(() => {
    latestOnAddRef.current()
  }, [])

  const onContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault()
    latestOnRemoveRef.current()
  }, [])

  return { ref: pressTargetRef, onClick, onContextMenu }
}
