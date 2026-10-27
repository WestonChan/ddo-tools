import { useSyncExternalStore } from 'react'
import type { PersistedState } from '../lib/persistedState'

export function usePersistedState<Snapshot, Change>(
  persistedState: PersistedState<Snapshot, Change>,
): Snapshot {
  return useSyncExternalStore(
    persistedState.subscribe,
    persistedState.snapshot,
    persistedState.snapshot,
  )
}
