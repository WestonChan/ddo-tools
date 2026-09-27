import { useEffect, useSyncExternalStore } from 'react'


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

export function useModalActive(active: boolean): void {
  useEffect(() => {
    if (!active) return
    increment()
    return () => decrement()
  }, [active])
}

export function useAnyModalActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function _resetModalActiveForTests(): void {
  _activeCount = 0
  notify()
}
