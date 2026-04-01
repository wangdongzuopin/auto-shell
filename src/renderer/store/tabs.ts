import { create } from 'zustand';
import type { TerminalSession } from '../../shared/types';
import { detectPlatform } from '../platform';

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
  commandHistoryByCwd: Record<string, string[]>;
  sessionLoaded: boolean;
  addTab: (shell?: TabShell) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  setTabCwd: (id: string, cwd: string) => void;
  renameTab: (id: string, name: string) => void;
  toggleSidebar: () => void;
  loadSession: () => Promise<void>;
  recordCommand: (cwd: string, command: string) => Promise<void>;
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

const defaultTabs = createDefaultTabs();

let tabCounter = 1;

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: defaultTabs,
  activeTabId: defaultTabs[0]?.id ?? null,
  sidebarOpen: false,
  commandHistoryByCwd: {},
  sessionLoaded: false,

  addTab: (shell = defaultShell) => {
    const id = String(++tabCounter);
    const name = shellNames[shell];
    set((state) => ({
      tabs: [...state.tabs, { id, name, shell, cwd: '~' }],
      activeTabId: id
    }));
    void persistSessionSnapshot(get());
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) {
      return;
    }

    const newTabs = tabs.filter((tab) => tab.id !== id);
    const newActiveTabId = activeTabId === id ? newTabs[newTabs.length - 1]?.id ?? null : activeTabId;
    set({ tabs: newTabs, activeTabId: newActiveTabId });
    void persistSessionSnapshot(get());
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
    void persistSessionSnapshot(get());
  },

  setTabCwd: (id, cwd) => {
    const nextCwd = normalizeCwd(cwd);
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, cwd: nextCwd } : tab))
    }));
    void persistSessionSnapshot(get());
  },

  renameTab: (id, name) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, name } : tab))
    }));
    void persistSessionSnapshot(get());
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  loadSession: async () => {
    try {
      const session = await window.api.getTerminalSession();
      const nextTabs = session.tabs.length > 0 ? session.tabs.map(toTab) : createDefaultTabs();
      const nextActiveTabId =
        session.activeTabId && nextTabs.some((tab) => tab.id === session.activeTabId)
          ? session.activeTabId
          : nextTabs[0]?.id ?? null;

      tabCounter = nextTabs.reduce((max, tab) => {
        const numericId = Number.parseInt(tab.id, 10);
        return Number.isFinite(numericId) ? Math.max(max, numericId) : max;
      }, 1);

      set({
        tabs: nextTabs,
        activeTabId: nextActiveTabId,
        commandHistoryByCwd: session.commandHistoryByCwd ?? {},
        sessionLoaded: true
      });
    } catch (error) {
      console.error('Failed to load terminal session:', error);
      set({ sessionLoaded: true });
    }
  },

  recordCommand: async (cwd, command) => {
    const normalizedCwd = normalizeCwd(cwd);
    const normalizedCommand = command.trim();

    if (!normalizedCommand) {
      return;
    }

    set((state) => ({
      commandHistoryByCwd: {
        ...state.commandHistoryByCwd,
        [normalizedCwd]: [
          normalizedCommand,
          ...(state.commandHistoryByCwd[normalizedCwd] ?? []).filter((item) => item !== normalizedCommand)
        ].slice(0, 20)
      }
    }));

    void persistSessionSnapshot(get());
    await window.api.recordTerminalCommand(normalizedCwd, normalizedCommand);
  }
}));

function createDefaultTabs(): Tab[] {
  return [{ id: '1', name: shellNames[defaultShell], shell: defaultShell, cwd: '~' }];
}

function toTab(tab: TerminalSession['tabs'][number]): Tab {
  return {
    id: tab.id,
    name: tab.name,
    shell: isTabShell(tab.shell) ? tab.shell : defaultShell,
    cwd: normalizeCwd(tab.cwd)
  };
}

function isTabShell(value: string): value is TabShell {
  return value in shellNames;
}

async function persistSessionSnapshot(state: TabsState): Promise<void> {
  const session: TerminalSession = {
    tabs: state.tabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      shell: tab.shell,
      cwd: normalizeCwd(tab.cwd)
    })),
    activeTabId: state.activeTabId,
    commandHistoryByCwd: state.commandHistoryByCwd
  };

  await window.api.saveTerminalSession(session);
}

function normalizeCwd(cwd: string): string {
  return cwd?.trim() || '~';
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
        { id: 'bash' as const, label: 'Bash', description: '经典 Unix shell，兼容大量脚本。' }
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
