import React, { useMemo, useState } from 'react';
import { DesktopPet } from '../DesktopPet';
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
      ? [{ group: '当前目录历史', commands: currentDirectoryHistory }]
      : [];

    const systemCommands = platform === 'windows' ? BASE_COMMANDS.windows : BASE_COMMANDS.unix;
    return [...historyGroup, ...BASE_COMMANDS.common, systemCommands];
  }, [activeTab, commandHistoryByCwd, platform]);

  const filteredCommands = useMemo(
    () =>
      allCommands
        .map((group) => ({
          ...group,
          commands: group.commands.filter((command) =>
            command.name.toLowerCase().includes(filter.toLowerCase()) ||
            command.cmd.toLowerCase().includes(filter.toLowerCase())
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
    <div id="sidebar">
      {/* Logo 区域 */}
      {/* 搜索框 */}
      <div className="cmd-search">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" />
          <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          placeholder="搜索命令..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>

      {/* 命令列表 */}
      <div className="cmd-list">
        {filteredCommands.map((group) => (
          <React.Fragment key={group.group}>
            <div className="cmd-gl">{group.group}</div>
            {group.commands.map((item, index) => (
              <button
                key={`${item.cmd}-${index}`}
                className="cmd-item"
                onClick={() => handleRun(item.cmd)}
              >
                <div className="cmd-text">
                  <span className="cmd-name">{item.name}</span>
                  {item.preview && <span className="cmd-preview">{item.preview}</span>}
                </div>
                <svg className="cmd-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </React.Fragment>
        ))}
        {filteredCommands.length === 0 && (
          <div className="cmd-empty">没有匹配的命令</div>
        )}
      </div>

      {/* 底部状态 */}
      <DesktopPet size="large" />

      <div className="sb-footer">
        <span className="sb-status">
          <span className="status-dot" />
          {activeTab ? `${shellNames[activeTab.shell]} · ${activeTab.name}` : '未连接'}
        </span>
      </div>

      <style>{`
        #sidebar {
          width: var(--sidebar-w);
          background: rgba(var(--bg-rgb), 0.68);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          overflow: hidden;
          backdrop-filter: blur(calc(14px + var(--terminal-blur) * 0.2));
          -webkit-backdrop-filter: blur(calc(14px + var(--terminal-blur) * 0.2));
        }
        .sb-logo {
          display: flex;
          align-items: center;
          padding: 16px 16px 12px;
          border-bottom: 1px solid var(--border);
        }
        .logo-text {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-text-primary);
          letter-spacing: -0.01em;
        }
        .cmd-search {
          margin: 12px 12px 8px;
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 14px;
          height: 36px;
          color: var(--text3);
        }
        .cmd-search:focus-within {
          border-border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .cmd-search input {
          background: none;
          border: none;
          outline: none;
          color: var(--text);
          font-family: var(--sans);
          font-size: 13px;
          flex: 1;
          min-height: 0;
        }
        .cmd-search input::placeholder {
          color: var(--text3);
        }
        .cmd-list {
          flex: 1;
          overflow-y: auto;
          padding: 4px 8px 12px;
        }
        .cmd-gl {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: var(--text3);
          padding: 14px 10px 6px;
        }
        .cmd-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 9px 10px;
          border-radius: 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: background .12s ease;
        }
        .cmd-item:hover {
          background: rgba(0,0,0,0.04);
        }
        .cmd-item:hover .cmd-arrow {
          color: var(--accent);
          transform: translateX(2px);
        }
        .cmd-text {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .cmd-name {
          font-size: 13px;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
        }
        .cmd-preview {
          font-size: 11px;
          color: var(--text3);
          font-family: var(--mono);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cmd-arrow {
          color: var(--text3);
          flex-shrink: 0;
          transition: color .12s ease, transform .12s ease;
        }
        .cmd-empty {
          padding: 14px 10px;
          color: var(--text3);
          font-size: 12px;
        }
        .sb-footer {
          padding: 8px 14px 10px;
          background: transparent;
        }
        .sb-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text3);
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
        }
      `}</style>
    </div>
  );
}

function getProjectPaths(platform: AppPlatform) {
  if (platform === 'windows') {
    return [
      { name: 'auto-shell', path: 'D:\\Agent\\auto-shell' },
      { name: 'Center', path: 'D:\\Agent\\Center' }
    ];
  }
  return [
    { name: 'auto-shell', path: '~/projects/auto-shell' },
    { name: 'workspace', path: '~/projects/workspace' }
  ];
}

function buildCdCommand(shell: string, targetPath: string): string {
  if (shell === 'powershell') return `Set-Location -LiteralPath "${targetPath}"`;
  if (shell === 'cmd') return `cd /d "${targetPath}"`;
  return `cd "${targetPath}"`;
}

function parseCwdCommand(command: string): string | null {
  const trimmed = command.trim();
  if (!trimmed) return null;
  const powershellMatch = trimmed.match(/^set-location(?:\s+-literalpath|\s+-path)?\s+(.+)$/i);
  if (powershellMatch) return cleanQuotedPath(powershellMatch[1]);
  const genericCdMatch = trimmed.match(/^cd\s+(.+)$/i);
  if (genericCdMatch) return cleanQuotedPath(genericCdMatch[1]);
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
  if (value.includes('mac')) return 'macos';
  if (value.includes('win')) return 'windows';
  return 'linux';
}
