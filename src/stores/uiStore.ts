import { create } from 'zustand'

export type RightPanelView = 'diff' | 'plan' | 'artifacts'

interface UIState {
  sidebarOpen: boolean
  rightPanelOpen: boolean
  rightPanelView: RightPanelView
  commandPaletteOpen: boolean
  terminalOpen: boolean

  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setRightPanelOpen: (open: boolean) => void
  toggleRightPanel: () => void
  setRightPanelView: (view: RightPanelView) => void
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void
  setTerminalOpen: (open: boolean) => void
  toggleTerminal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  rightPanelOpen: false,
  rightPanelView: 'plan',
  commandPaletteOpen: false,
  terminalOpen: false,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightPanelView: (view) => set({ rightPanelView: view }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  setTerminalOpen: (open) => set({ terminalOpen: open }),
  toggleTerminal: () => set((s) => ({ terminalOpen: !s.terminalOpen })),
}))
