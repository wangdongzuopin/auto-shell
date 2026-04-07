// src/state/AppState.tsx

import React, { createContext, useContext, useState } from 'react'
import type { AppState, AppStateStore } from './AppStateStore'
import { createStore } from './store'
import { getDefaultAppState } from './AppStateStore'

export const AppStoreContext = createContext<AppStateStore | null>(null)

export function AppStateProvider({
  children,
  initialState,
  onChangeAppState,
}: {
  children: React.ReactNode
  initialState?: AppState
  onChangeAppState?: (args: { newState: AppState; oldState: AppState }) => void
}) {
  const [store] = useState<AppStateStore>(() =>
    createStore(initialState ?? getDefaultAppState(), onChangeAppState)
  )

  return (
    <AppStoreContext.Provider value={store}>
      {children}
    </AppStoreContext.Provider>
  )
}

export function useAppStore(): AppStateStore {
  const store = useContext(AppStoreContext)
  if (!store) {
    throw new Error('useAppStore must be used within AppStateProvider')
  }
  return store
}
