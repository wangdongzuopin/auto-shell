import React from 'react';
import { detectPlatform } from '../../platform';
import { shellNames, useTabsStore } from '../../store/tabs';

interface TabBarProps {
  onOpenChat: () => void;
  onOpenSettings: () => void;
}

export function TabBar({ onOpenChat, onOpenSettings }: TabBarProps) {
  const platform = detectPlatform();
  const { tabs, activeTabId, addTab, closeTab, setActiveTab, toggleSidebar } = useTabsStore();
  const sidebarOpen = useTabsStore((state) => state.sidebarOpen);

  const handleCloseTab = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    closeTab(id);
  };

  return (
    <div id="tabbar">
      <div className="tabs">
        {platform === 'macos' && <div className="mac-traffic-gap" aria-hidden="true" />}
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={`${tab.name} / ${shellNames[tab.shell]}`}
          >
            <span className="tab-dot" />
            <span className="tab-name">{tab.name}</span>
            <span className="tab-shell">{shellNames[tab.shell]}</span>
            <span className="tab-close" onClick={(event) => handleCloseTab(event, tab.id)}>
              ×
            </span>
          </button>
        ))}
        <div className="tab-add-wrap">
          <button
            className="tab-add"
            onClick={() => addTab()}
            title="新建终端"
            aria-label="新建终端"
          >
            +
          </button>
        </div>
      </div>
      <div className="toolbar">
        <button
          className={`icon-btn ${sidebarOpen ? 'active' : ''}`}
          onClick={toggleSidebar}
          title="快捷命令"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="1.5" rx=".75" fill="currentColor" />
            <rect x="2" y="7" width="9" height="1.5" rx=".75" fill="currentColor" />
            <rect x="2" y="11" width="7" height="1.5" rx=".75" fill="currentColor" />
          </svg>
        </button>
        <button className="icon-btn" onClick={onOpenChat} title="Assistant 对话">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 4.25C3 3.56 3.56 3 4.25 3h7.5C12.44 3 13 3.56 13 4.25v5.5c0 .69-.56 1.25-1.25 1.25H7l-2.75 2v-2H4.25C3.56 11 3 10.44 3 9.75v-5.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M5.5 6.25h5M5.5 8.25h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
        <button className="icon-btn" onClick={onOpenSettings} title="设置">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2.5 9.35 3l1.38-.5 1 1.73-.88 1.2.38 1.43 1.42.56v2.16l-1.42.56-.38 1.43.88 1.2-1 1.73-1.38-.5L8 13.5l-1.35.5-1.38.5-1-1.73.88-1.2-.38-1.43-1.42-.56V7.42l1.42-.56.38-1.43-.88-1.2 1-1.73 1.38.5L8 2.5Z" stroke="currentColor" strokeWidth="1.05" strokeLinejoin="round" />
            <circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
      <style>{`
        #tabbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 12px;
          background:
            linear-gradient(180deg, color-mix(in srgb, var(--bg2) 82%, white 18%), color-mix(in srgb, var(--bg) 92%, white 8%));
          border-bottom: 1px solid var(--border);
          user-select: none;
          backdrop-filter: blur(16px) saturate(1.08);
        }
        .tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }
        .mac-traffic-gap {
          width: 72px;
          flex-shrink: 0;
        }
        .tab,
        .tab-add,
        .icon-btn {
          border: 1px solid transparent;
          background: transparent;
        }
        .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 34px;
          padding: 0 14px;
          border-radius: 12px;
          font-size: 12px;
          font-family: var(--sans);
          color: var(--text2);
          cursor: pointer;
          white-space: nowrap;
          min-width: 0;
          transition: background .16s ease, border-color .16s ease, color .16s ease, transform .16s ease;
        }
        .tab:hover {
          background: color-mix(in srgb, var(--bg3) 90%, white 10%);
          color: var(--text);
        }
        .tab.active {
          background: color-mix(in srgb, var(--bg) 86%, white 14%);
          color: var(--text);
          border-color: var(--border);
          box-shadow: 0 8px 22px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .tab-dot {
          width: 7px;
          height: 7px;
          border-radius: 3px;
          background: rgba(76,141,255,0.8);
          flex-shrink: 0;
        }
        .tab-name {
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tab-shell {
          padding: 2px 6px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--bg3) 90%, white 10%);
          color: var(--text3);
          font-size: 10px;
          font-family: var(--mono);
        }
        .tab.active .tab-shell {
          background: rgba(76,141,255,0.1);
          color: var(--accent);
        }
        .tab-close {
          width: 16px;
          height: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          color: var(--text3);
          font-size: 14px;
          flex-shrink: 0;
        }
        .tab-close:hover {
          background: color-mix(in srgb, var(--bg3) 88%, white 12%);
          color: var(--text);
        }
        .tab-add-wrap {
          flex-shrink: 0;
        }
        .tab-add,
        .icon-btn {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          color: var(--text2);
          cursor: pointer;
          transition: background .16s ease, border-color .16s ease, color .16s ease, transform .16s ease;
        }
        .tab-add:hover,
        .icon-btn:hover {
          background: color-mix(in srgb, var(--bg3) 90%, white 10%);
          border-color: var(--border);
          color: var(--text);
          transform: translateY(-1px);
        }
        .toolbar {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .icon-btn.active {
          color: var(--accent);
          border-color: rgba(76,141,255,0.3);
          background: rgba(76,141,255,0.08);
        }
      `}</style>
    </div>
  );
}
