import { create } from 'zustand'

export interface TerminalTab {
  id: string
  title: string
  cwd: string
}

interface TerminalState {
  tabs: TerminalTab[]
  activeTabId: string | null

  addTab: (cwd?: string, title?: string) => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (cwd, title) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const tab: TerminalTab = {
      id,
      title: title || `终端 ${get().tabs.length + 1}`,
      cwd: cwd || '',
    }
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: id }))
  },

  removeTab: (id) => {
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id)
      const activeTabId = s.activeTabId === id
        ? tabs[tabs.length - 1]?.id || null
        : s.activeTabId
      return { tabs, activeTabId }
    })
  },

  setActiveTab: (id) => set({ activeTabId: id }),
}))
