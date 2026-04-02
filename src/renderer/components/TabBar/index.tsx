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
          gap: 8px;
          padding: 0 12px;
          background: var(--bg2);
          border-bottom: 1px solid var(--border-subtle);
          user-select: none;
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
          height: 32px;
          padding: 0 12px;
          border-radius: 10px;
          font-size: 12px;
          font-family: var(--sans);
          color: var(--text3);
          cursor: pointer;
          white-space: nowrap;
          min-width: 0;
          border: 1px solid transparent;
          transition: background .15s ease, border-color .15s ease, color .15s ease, transform .12s ease;
        }
        .tab:hover {
          background: rgba(255,255,255,0.04);
          color: var(--text2);
        }
        .tab.active {
          background: var(--surface-raised, rgba(255,255,255,0.04));
          color: var(--text-primary, #e8ecf0);
          border: 1px solid var(--border-default, rgba(255,255,255,0.10));
          border-bottom: 2px solid var(--accent);
          box-shadow: var(--shadow-sm);
        }
        .tab-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          flex-shrink: 0;
          opacity: 0.7;
        }
        .tab.active .tab-dot {
          background: var(--green);
          opacity: 1;
          box-shadow: 0 0 6px rgba(71, 209, 108, 0.5);
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
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: var(--text2);
          cursor: pointer;
          transition: background .15s ease, border-color .15s ease, color .15s ease, transform .15s ease;
        }
        .tab-add:hover,
        .icon-btn:hover {
          background: rgba(255,255,255,0.05);
          border-color: var(--border-subtle);
          color: var(--text2);
          transform: translateY(-1px);
        }
        .tab-add:hover {
          background: rgba(255,255,255,0.05);
          border-color: var(--border-subtle);
          color: var(--text2);
        }
        .icon-btn {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text3);
          cursor: pointer;
          transition: background .15s ease, border-color .15s ease, color .15s ease, transform .10s ease;
        }
        .icon-btn:hover {
          background: rgba(255,255,255,0.05);
          border-color: var(--border-subtle);
          color: var(--text2);
        }
        .icon-btn:active {
          transform: scale(0.94);
        }
        .toolbar {
          display: flex;
          align-items: center;
          gap: 4px;
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
