import { create } from 'zustand';

export interface Tab {
  id: string;
  name: string;
  shell: 'powershell' | 'cmd' | 'wsl' | 'git-bash';
  cwd: string;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  sidebarOpen: boolean;
  addTab: (shell?: Tab['shell']) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  toggleSidebar: () => void;
}

const shellNames: Record<Tab['shell'], string> = {
  powershell: 'PowerShell',
  cmd: 'CMD',
  wsl: 'WSL',
  'git-bash': 'Git Bash'
};

let tabCounter = 1;

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [
    { id: '1', name: 'PowerShell', shell: 'powershell', cwd: '~' }
  ],
  activeTabId: '1',
  sidebarOpen: false,

  addTab: (shell = 'powershell') => {
    const id = String(++tabCounter);
    const name = shellNames[shell];
    set(state => ({
      tabs: [...state.tabs, { id, name, shell, cwd: '~' }],
      activeTabId: id
    }));
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) return; // Keep at least one tab
    const newTabs = tabs.filter(t => t.id !== id);
    const newActive = activeTabId === id ? newTabs[newTabs.length - 1].id : activeTabId;
    set({ tabs: newTabs, activeTabId: newActive });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  renameTab: (id, name) => set(state => ({
    tabs: state.tabs.map(t => t.id === id ? { ...t, name } : t)
  })),

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen }))
}));
