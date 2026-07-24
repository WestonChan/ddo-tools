import { useEffect, useSyncExternalStore } from 'react'

/**
 * Refcounted "is any modal-style overlay currently active?" signal.
 *
 * Modal-shape components (resources drawer, confirm dialogs, future
 * overlays) call `useModalActive(true)` while they're on screen. The
 * module increments a refcount each time, decrements on unmount/false.
 * Whoever wants to react to "anything modal active?" reads the boolean
 * via `useAnyModalActive()` — used by AppLayout to apply `inert` to the
 * nav bar and bottom bar so keyboard / focus / click events don't reach
 * background chrome while a modal is open.
 *
 * Refcounting (not a boolean) is the load-bearing detail: stacked modals
 * keep the background inert until BOTH close. A boolean would flip to
 * false when the first modal closes, un-inerting the background even if
 * a second modal is still active.
 *
 * Background reading: docs/state-management.md. Same shape as the
 * `useDatabase` external-store pattern — module-level state +
 * `useSyncExternalStore` for synchronous first-render reads + multi-
 * consumer notification.
 */

let _activeCount = 0
const _listeners = new Set<() => void>()

function notify(): void {
  _listeners.forEach((fn) => fn())
}

function increment(): void {
  _activeCount += 1
  notify()
}

function decrement(): void {
  _activeCount -= 1
  notify()
}

function subscribe(listener: () => void): () => void {
  _listeners.add(listener)
  return () => {
    _listeners.delete(listener)
  }
}

function getSnapshot(): boolean {
  return _activeCount > 0
}

/**
 * Assert that this component represents an active modal/overlay while
 * `active === true`. On mount-with-active (or transition from
 * `active=false` → `true`), the refcount increments. On unmount or
 * transition to false, it decrements. AppLayout reacts by inerting the
 * background chrome.
 */
export function useModalActive(active: boolean): void {
  useEffect(() => {
    if (!active) return
    increment()
    return () => decrement()
  }, [active])
}

/**
 * Returns `true` whenever at least one modal is asserting itself as
 * active. Used by AppLayout to gate `inert` on nav bar + bottom bar.
 * Synchronous first-render read via `useSyncExternalStore` — no flash
 * on mount.
 */
export function useAnyModalActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Test-only: reset the refcount between vitest cases so module state
 *  doesn't bleed across tests. */
export function _resetModalActiveForTests(): void {
  _activeCount = 0
  notify()
}
