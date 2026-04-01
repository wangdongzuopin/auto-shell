import React, { useMemo, useState } from 'react';
import { shellNames, useTabsStore } from '../../store/tabs';
import { toast } from '../Toast';

type AppPlatform = 'windows' | 'macos' | 'linux';

type QuickCommandItem = {
  name: string;
  cmd: string;
  preview?: string;
  actionLabel?: string;
};

type QuickCommandGroup = {
  group: string;
  commands: QuickCommandItem[];
};

const BASE_COMMANDS: {
  common: QuickCommandGroup[];
  windows: QuickCommandGroup;
  unix: QuickCommandGroup;
} = {
  common: [
    {
      group: 'Git',
      commands: [
        { name: '查看状态', cmd: 'git status' },
        { name: '最近提交', cmd: 'git log --oneline -10' },
        { name: '拉取主分支', cmd: 'git pull origin main' },
        { name: '推送当前分支', cmd: 'git push origin HEAD' }
      ]
    },
    {
      group: 'Node',
      commands: [
        { name: '启动开发环境', cmd: 'npm run dev' },
        { name: '构建产物', cmd: 'npm run build' },
        { name: '安装依赖', cmd: 'npm install' }
      ]
    }
  ],
  windows: {
    group: '系统',
    commands: [
      { name: '网络信息', cmd: 'ipconfig /all' },
      { name: '清屏', cmd: 'cls' },
      { name: '查看进程', cmd: 'tasklist' }
    ]
  },
  unix: {
    group: '系统',
    commands: [
      { name: '网络信息', cmd: 'ifconfig || ip addr' },
      { name: '清屏', cmd: 'clear' },
      { name: '查看进程', cmd: 'ps aux' }
    ]
  }
};

export function QuickCommands() {
  const [filter, setFilter] = useState('');
  const sidebarOpen = useTabsStore((state) => state.sidebarOpen);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const tabs = useTabsStore((state) => state.tabs);
  const setTabCwd = useTabsStore((state) => state.setTabCwd);
  const commandHistoryByCwd = useTabsStore((state) => state.commandHistoryByCwd);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const platform = useMemo(() => detectPlatform(), []);

  const allCommands = useMemo<QuickCommandGroup[]>(() => {
    if (!activeTab) {
      return [...BASE_COMMANDS.common, platform === 'windows' ? BASE_COMMANDS.windows : BASE_COMMANDS.unix];
    }

    const currentDirectoryHistory = (commandHistoryByCwd[activeTab.cwd] ?? []).map((command) => ({
      name: getHistoryCommandLabel(command),
      cmd: command,
      preview: activeTab.cwd,
      actionLabel: '再次执行'
    }));

    const historyGroup = currentDirectoryHistory.length > 0
      ? [{
          group: '当前目录历史',
          commands: currentDirectoryHistory
        }]
      : [];

    const projectGroup = [{
      group: '项目切换',
      commands: getProjectPaths(platform).map((project) => ({
        name: project.name,
        cmd: buildCdCommand(activeTab.shell, project.path),
        preview: project.path,
        actionLabel: '切换项目'
      }))
    }];

    const systemCommands = platform === 'windows' ? BASE_COMMANDS.windows : BASE_COMMANDS.unix;
    return [...historyGroup, ...projectGroup, ...BASE_COMMANDS.common, systemCommands];
  }, [activeTab, commandHistoryByCwd, platform]);

  const filteredCommands = useMemo(
    () =>
      allCommands
        .map((group) => ({
          ...group,
          commands: group.commands.filter((command) =>
            command.name.toLowerCase().includes(filter.toLowerCase()) ||
            command.cmd.toLowerCase().includes(filter.toLowerCase()) ||
            (command.preview ?? '').toLowerCase().includes(filter.toLowerCase())
          )
        }))
        .filter((group) => group.commands.length > 0),
    [allCommands, filter]
  );

  const handleRun = (cmd: string) => {
    if (!activeTabId || !activeTab) {
      toast('当前没有可执行命令的终端');
      return;
    }

    window.api.writePty(activeTabId, `${cmd}\r`);

    const nextCwd = parseCwdCommand(cmd);
    if (nextCwd) {
      setTabCwd(activeTabId, nextCwd);
    }
  };

  return (
    <div id="sidebar" className={sidebarOpen ? '' : 'collapsed'}>
      <div className="sb-head">
        <div>
          <span className="sb-title">快捷命令</span>
          <div className="sb-meta">
            {activeTab ? `${shellNames[activeTab.shell]} / ${activeTab.name}` : '未关联终端'}
          </div>
        </div>
      </div>
      <div className="cmd-search">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <input
          placeholder="搜索命令"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>
      <div className="cmd-list">
        {filteredCommands.map((group) => (
          <React.Fragment key={group.group}>
            <div className="cmd-gl">{group.group}</div>
            {group.commands.map((item, index) => (
              <button
                key={`${item.cmd}-${index}`}
                className="cmd-item"
                onClick={() => handleRun(item.cmd)}
                title={`在当前终端执行：${item.cmd}`}
              >
                <span className="cmd-main">
                  <span className="cmd-name">{item.name}</span>
                  <span className="cmd-preview">{item.preview ?? item.cmd}</span>
                </span>
                <span className="cmd-run">{item.actionLabel ?? '执行到当前终端'}</span>
              </button>
            ))}
          </React.Fragment>
        ))}
        {filteredCommands.length === 0 && <div className="cmd-empty">没有匹配的命令</div>}
      </div>
      <style>{`
        #sidebar {
          width: var(--sidebar-w);
          background: linear-gradient(180deg, color-mix(in srgb, var(--bg2) 92%, white 8%), var(--bg));
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: width .18s ease, opacity .18s ease;
          overflow: hidden;
        }
        #sidebar.collapsed {
          width: 0;
          opacity: 0;
        }
        .sb-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 14px 12px;
          border-bottom: 1px solid var(--border);
        }
        .sb-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--text3);
        }
        .sb-meta {
          margin-top: 6px;
          font-size: 11px;
          color: var(--text2);
          font-family: var(--mono);
        }
        .cmd-search {
          margin: 12px 10px 8px;
          background: color-mix(in srgb, var(--bg3) 90%, white 10%);
          border: 1px solid var(--border);
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          height: 36px;
          color: var(--text3);
        }
        .cmd-search input {
          background: none;
          border: none;
          outline: none;
          color: var(--text);
          font-family: var(--sans);
          font-size: 12px;
          flex: 1;
        }
        .cmd-list {
          flex: 1;
          overflow-y: auto;
          padding: 4px 8px 12px;
        }
        .cmd-gl {
          font-size: 10px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--text3);
          padding: 12px 8px 6px;
          font-weight: 700;
        }
        .cmd-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          text-align: left;
        }
        .cmd-item:hover {
          background: color-mix(in srgb, var(--bg3) 90%, white 10%);
          border-color: var(--border);
        }
        .cmd-main {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .cmd-name {
          font-size: 12px;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cmd-preview {
          font-size: 11px;
          color: var(--text3);
          font-family: var(--mono);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cmd-run {
          flex-shrink: 0;
          font-size: 11px;
          color: var(--accent);
        }
        .cmd-empty {
          padding: 14px 10px;
          color: var(--text3);
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}

function getProjectPaths(platform: AppPlatform) {
  if (platform === 'windows') {
    return [
      { name: 'auto-shell', path: 'D:\\Agent\\auto-shell' },
      { name: 'claude-code-rev', path: 'D:\\Agent\\claude-code-rev' },
      { name: 'Center', path: 'D:\\Agent\\Center' }
    ];
  }

  return [
    { name: 'auto-shell', path: '~/projects/auto-shell' },
    { name: 'workspace', path: '~/projects/workspace' },
    { name: 'dotfiles', path: '~/dotfiles' }
  ];
}

function buildCdCommand(shell: string, targetPath: string): string {
  if (shell === 'powershell') {
    return `Set-Location -LiteralPath "${targetPath}"`;
  }

  if (shell === 'cmd') {
    return `cd /d "${targetPath}"`;
  }

  return `cd "${targetPath}"`;
}

function parseCwdCommand(command: string): string | null {
  const trimmed = command.trim();
  if (!trimmed) {
    return null;
  }

  const powershellMatch = trimmed.match(/^set-location(?:\s+-literalpath|\s+-path)?\s+(.+)$/i);
  if (powershellMatch) {
    return cleanQuotedPath(powershellMatch[1]);
  }

  const windowsCdMatch = trimmed.match(/^cd\s+\/d\s+(.+)$/i);
  if (windowsCdMatch) {
    return cleanQuotedPath(windowsCdMatch[1]);
  }

  const genericCdMatch = trimmed.match(/^cd\s+(.+)$/i);
  if (genericCdMatch) {
    return cleanQuotedPath(genericCdMatch[1]);
  }

  return null;
}

function cleanQuotedPath(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function getHistoryCommandLabel(command: string): string {
  const compact = command.replace(/\s+/g, ' ').trim();
  return compact.length > 28 ? `${compact.slice(0, 28)}...` : compact;
}

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
