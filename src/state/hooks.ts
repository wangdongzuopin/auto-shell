// src/state/hooks.ts

import { useCallback, useSyncExternalStore } from 'react'
import type { AppState } from './AppStateStore'
import { useAppStore } from './AppState'

export function useAppState<T>(selector: (state: AppState) => T): T {
  const store = useAppStore()
  const getSnapshot = useCallback(() => selector(store.getState()), [store, selector])
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

export function useSetAppState() {
  return useAppStore().setState
}

export function useAppStateStore() {
  return useAppStore()
}
