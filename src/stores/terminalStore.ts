import { create } from 'zustand'

export type ProcessState = 'running' | 'exited'

export interface TerminalTab {
  id: string
  title: string
  cwd: string
  sessionId: string | null
  processState: ProcessState
  cols: number
  rows: number
}

interface TerminalState {
  tabs: TerminalTab[]
  activeTabId: string | null

  addTab: (cwd?: string, title?: string) => string
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  setSessionId: (tabId: string, sessionId: string) => void
  setProcessState: (tabId: string, state: ProcessState) => void
  setDimensions: (tabId: string, cols: number, rows: number) => void
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
      sessionId: null,
      processState: 'running',
      cols: 80,
      rows: 24,
    }
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: id }))
    return id
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

  setSessionId: (tabId, sessionId) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, sessionId } : t)),
    }))
  },

  setProcessState: (tabId, processState) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, processState } : t)),
    }))
  },

  setDimensions: (tabId, cols, rows) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, cols, rows } : t)),
    }))
  },
}))
