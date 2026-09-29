import { useEffect, useSyncExternalStore } from 'react'

let activeModalCount = 0
const activeModalCountListeners = new Set<() => void>()

function notifyActiveModalCountListeners(): void {
  activeModalCountListeners.forEach((fn) => fn())
}

function incrementActiveModalCount(): void {
  activeModalCount += 1
  notifyActiveModalCountListeners()
}

function decrementActiveModalCount(): void {
  activeModalCount -= 1
  notifyActiveModalCountListeners()
}

function subscribeToActiveModalCount(listener: () => void): () => void {
  activeModalCountListeners.add(listener)
  return () => {
    activeModalCountListeners.delete(listener)
  }
}

function isAnyModalActive(): boolean {
  return activeModalCount > 0
}

export function useRegisterActiveModal(isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return
    incrementActiveModalCount()
    return () => decrementActiveModalCount()
  }, [isActive])
}

export function useIsAnyModalActive(): boolean {
  return useSyncExternalStore(subscribeToActiveModalCount, isAnyModalActive, isAnyModalActive)
}

export function resetActiveModalCountForTests(): void {
  activeModalCount = 0
  notifyActiveModalCountListeners()
}
