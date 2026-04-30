import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelView: "diff" | "plan" | "file" | null;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openRightPanel: (view: "diff" | "plan" | "file") => void;
  closeRightPanel: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  rightPanelOpen: false,
  rightPanelView: null,
  commandPaletteOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openRightPanel: (view) => set({ rightPanelOpen: true, rightPanelView: view }),
  closeRightPanel: () => set({ rightPanelOpen: false, rightPanelView: null }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}));
