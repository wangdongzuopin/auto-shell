import { create } from "zustand";

interface TerminalTab {
  id: string;
  name: string;
  cwd?: string;
}

interface TerminalState {
  open: boolean;
  tabs: TerminalTab[];
  activeTabId: string | null;
  toggle: () => void;
  openTerminal: () => void;
  closeTerminal: () => void;
  addTab: (tab?: Partial<TerminalTab>) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

let tabCounter = 0;

export const useTerminalStore = create<TerminalState>((set, get) => ({
  open: false,
  tabs: [],
  activeTabId: null,

  toggle: () => {
    const state = get();
    if (state.open) {
      set({ open: false });
    } else {
      if (state.tabs.length === 0) {
        get().addTab();
      }
      set({ open: true });
    }
  },

  openTerminal: () => {
    const state = get();
    if (state.tabs.length === 0) get().addTab();
    set({ open: true });
  },

  closeTerminal: () => set({ open: false }),

  addTab: (tab) => {
    tabCounter++;
    const newTab: TerminalTab = {
      id: `term-${tabCounter}`,
      name: tab?.name || `Terminal ${tabCounter}`,
      cwd: tab?.cwd,
    };
    set((s) => ({ tabs: [...s.tabs, newTab], activeTabId: newTab.id }));
  },

  closeTab: (id) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      return {
        tabs,
        activeTabId: s.activeTabId === id ? tabs[tabs.length - 1]?.id || null : s.activeTabId,
      };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),
}));
