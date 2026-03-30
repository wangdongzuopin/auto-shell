import { create } from 'zustand';

export type TabShell = 'powershell' | 'cmd' | 'wsl' | 'git-bash' | 'zsh' | 'bash';

export interface Tab {
  id: string;
  name: string;
  shell: TabShell;
  cwd: string;
}

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

type AppPlatform = 'windows' | 'macos' | 'linux';

const platform = detectPlatform();
const defaultShell = getDefaultShell(platform);

export const shellNames: Record<TabShell, string> = {
  powershell: 'PowerShell',
  cmd: 'CMD',
  wsl: 'WSL',
  'git-bash': 'Git Bash',
  zsh: 'Zsh',
  bash: 'Bash'
};

export const shellOptions: Array<{ id: TabShell; label: string; description: string }> =
  getShellOptions(platform);

let tabCounter = 1;

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [
    { id: '1', name: shellNames[defaultShell], shell: defaultShell, cwd: '~' }
  ],
  activeTabId: '1',
  sidebarOpen: false,

  addTab: (shell = defaultShell) => {
    const id = String(++tabCounter);
    const name = shellNames[shell];
    set((state) => ({
      tabs: [...state.tabs, { id, name, shell, cwd: '~' }],
      activeTabId: id
    }));
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter((t) => t.id !== id);
    const newActive = activeTabId === id ? newTabs[newTabs.length - 1].id : activeTabId;
    set({ tabs: newTabs, activeTabId: newActive });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  setTabCwd: (id, cwd) => set((state) => ({
    tabs: state.tabs.map((tab) => tab.id === id ? { ...tab, cwd } : tab)
  })),

  renameTab: (id, name) => set((state) => ({
    tabs: state.tabs.map((tab) => tab.id === id ? { ...tab, name } : tab)
  })),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }))
}));

function detectPlatform(): AppPlatform {
  const value = typeof navigator === 'undefined' ? '' : navigator.userAgent.toLowerCase();

  if (value.includes('mac')) {
    return 'macos';
  }

  if (value.includes('win')) {
    return 'windows';
  }

  return 'linux';
}

function getDefaultShell(currentPlatform: AppPlatform): TabShell {
  switch (currentPlatform) {
    case 'macos':
      return 'zsh';
    case 'linux':
      return 'bash';
    default:
      return 'powershell';
  }
}

function getShellOptions(currentPlatform: AppPlatform) {
  switch (currentPlatform) {
    case 'macos':
      return [
        { id: 'zsh' as const, label: 'Zsh', description: 'macOS 默认 shell，适合日常开发和命令行工作。' },
        { id: 'bash' as const, label: 'Bash', description: '经典 Unix shell，兼容多数脚本场景。' }
      ];
    case 'linux':
      return [
        { id: 'bash' as const, label: 'Bash', description: 'Linux 默认 shell，适合常规命令和脚本。' },
        { id: 'zsh' as const, label: 'Zsh', description: '更现代的交互式 shell 体验。' }
      ];
    default:
      return [
        { id: 'powershell' as const, label: 'PowerShell', description: 'Windows 默认 shell，适合系统管理和脚本。' },
        { id: 'cmd' as const, label: 'CMD', description: '经典命令提示符，兼容老式命令。' },
        { id: 'wsl' as const, label: 'WSL', description: '进入 Linux 子系统环境。' },
        { id: 'git-bash' as const, label: 'Git Bash', description: '更接近 Unix 的 Bash 体验。' }
      ];
  }
}
