import React, { useState } from 'react';
import { useTabsStore } from '../../store/tabs';

const DEFAULT_COMMANDS = [
  { group: 'Git', commands: [
    { name: '状态检查', cmd: 'git status' },
    { name: '最近提交', cmd: 'git log --oneline -10' },
    { name: '拉取主分支', cmd: 'git pull origin main' },
    { name: '推送到远程', cmd: 'git push origin HEAD' }
  ]},
  { group: '服务', commands: [
    { name: '启动开发服务', cmd: 'npm run dev' },
    { name: '构建生产包', cmd: 'npm run build' },
    { name: '安装依赖', cmd: 'npm install' }
  ]},
  { group: '系统', commands: [
    { name: '网络信息', cmd: 'ipconfig /all' },
    { name: '清理屏幕', cmd: 'cls' },
    { name: '查看进程', cmd: 'tasklist' }
  ]}
];

export function QuickCommands() {
  const [filter, setFilter] = useState('');
  const sidebarOpen = useTabsStore(s => s.sidebarOpen);

  const filteredCommands = DEFAULT_COMMANDS.map(group => ({
    ...group,
    commands: group.commands.filter(c =>
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.cmd.toLowerCase().includes(filter.toLowerCase())
    )
  })).filter(g => g.commands.length > 0);

  const handleRun = (cmd: string) => {
    const activeTabId = useTabsStore.getState().activeTabId;
    if (activeTabId) {
      window.api.writePty(activeTabId, cmd + '\r');
    }
  };

  return (
    <div id="sidebar" className={sidebarOpen ? '' : 'collapsed'}>
      <div className="sb-head">
        <span className="sb-title">快捷命令</span>
        <div className="icon-btn" title="新增命令" onClick={() => {}}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <div className="cmd-search">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <input
          placeholder="搜索命令…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="cmd-list">
        {filteredCommands.map(group => (
          <React.Fragment key={group.group}>
            <div className="cmd-gl">{group.group}</div>
            {group.commands.map((item, idx) => (
              <div key={idx} className="cmd-item" onClick={() => handleRun(item.cmd)}>
                <span className="cmd-name">{item.name}</span>
                <span className="cmd-preview">{item.cmd}</span>
                <span className="cmd-run">↵</span>
              </div>
            ))}
          </React.Fragment>
        ))}
        {filteredCommands.length === 0 && (
          <div className="cmd-empty">没有找到匹配的命令</div>
        )}
      </div>
      <style>{`
        #sidebar {
          width: var(--sidebar-w);
          background: var(--bg2);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: width .2s ease, opacity .2s ease;
          overflow: hidden;
        }
        #sidebar.collapsed { width: 0; opacity: 0; }
        .sb-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 14px 10px;
          border-bottom: 1px solid var(--border);
        }
        .sb-title {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--text2);
        }
        .cmd-search {
          margin: 10px 10px 6px;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 10px;
          height: 30px;
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
        .cmd-search input::placeholder { color: var(--text3); }
        .cmd-list { flex: 1; overflow-y: auto; padding: 4px 6px 10px; }
        .cmd-gl {
          font-size: 10px;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: var(--text3);
          padding: 10px 8px 4px;
          font-weight: 500;
        }
        .cmd-item {
          display: flex;
          align-items: center;
          padding: 7px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: background .1s;
          gap: 6px;
        }
        .cmd-item:hover { background: var(--bg3); }
        .cmd-item:hover .cmd-run { opacity: 1; }
        .cmd-name {
          font-size: 12px;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .cmd-preview {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--text2);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 90px;
        }
        .cmd-run {
          opacity: 0;
          font-size: 10px;
          color: var(--accent);
          transition: opacity .1s;
        }
        .cmd-empty {
          font-size: 12px;
          color: var(--text3);
          text-align: center;
          padding: 20px;
        }
        .icon-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          color: var(--text2);
          cursor: pointer;
          transition: background .12s, color .12s;
        }
        .icon-btn:hover { background: var(--bg3); color: var(--text); }
      `}</style>
    </div>
  );
}