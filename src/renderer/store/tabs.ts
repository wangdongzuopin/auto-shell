import { create } from 'zustand';

export interface Tab {
  id: string;
  name: string;
  shell: 'powershell' | 'cmd' | 'wsl' | 'git-bash';
  cwd: string;
}

export type TabShell = Tab['shell'];

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  sidebarOpen: boolean;
  addTab: (shell?: TabShell) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  setTabCwd: (id: string, cwd: string) => void;
  renameTab: (id: string, name: string) => void;
  toggleSidebar: () => void;
}

export const shellNames: Record<TabShell, string> = {
  powershell: 'PowerShell',
  cmd: 'CMD',
  wsl: 'WSL',
  'git-bash': 'Git Bash'
};

export const shellOptions: Array<{ id: TabShell; label: string; description: string }> = [
  { id: 'powershell', label: 'PowerShell', description: 'Windows 默认 shell，适合系统管理和脚本。' },
  { id: 'cmd', label: 'CMD', description: '经典命令提示符，兼容老式命令。' },
  { id: 'wsl', label: 'WSL', description: '进入 Linux 子系统环境。' },
  { id: 'git-bash', label: 'Git Bash', description: '更接近 Unix 的 Bash 体验。' }
];

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

  setTabCwd: (id, cwd) => set((state) => ({
    tabs: state.tabs.map((tab) => tab.id === id ? { ...tab, cwd } : tab)
  })),

  renameTab: (id, name) => set(state => ({
    tabs: state.tabs.map(t => t.id === id ? { ...t, name } : t)
  })),

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen }))
}));
