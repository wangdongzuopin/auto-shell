import React from 'react';
import { detectPlatform } from '../../platform';
import { shellNames, useTabsStore } from '../../store/tabs';

interface TabBarProps {
  onOpenChat: () => void;
  onOpenSettings: () => void;
}

export function TabBar({ onOpenChat, onOpenSettings }: TabBarProps) {
  const platform = detectPlatform();
  const { tabs, activeTabId, addTab, closeTab, setActiveTab } = useTabsStore();

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
          gap: 6px;
          padding: 0 12px;
          min-height: 48px;
          background: rgba(var(--bg-rgb), calc(var(--terminal-shell-alpha) * 0.95));
          border-bottom: 1px solid var(--border);
          user-select: none;
          flex-shrink: 0;
          backdrop-filter: blur(calc(8px + var(--terminal-blur) * 0.16));
          -webkit-backdrop-filter: blur(calc(8px + var(--terminal-blur) * 0.16));
        }
        .tabs {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          min-width: 0;
        }
        .mac-traffic-gap {
          width: 60px;
          flex-shrink: 0;
        }
        .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 34px;
          padding: 0 14px;
          border-radius: 0;
          font-size: 13px;
          font-family: var(--sans);
          color: var(--text2);
          cursor: pointer;
          white-space: nowrap;
          min-width: 0;
          border: 1px solid transparent;
          background: transparent;
          transition: background .14s ease, color .14s ease, border-color .14s ease;
        }
        .tab:hover {
          background: rgba(0,0,0,0.04);
          color: var(--text);
        }
        .tab.active {
          background: rgba(var(--bg-rgb), calc(var(--terminal-shell-alpha) * 1.4));
          color: var(--text-primary);
          border-color: var(--border);
          font-weight: 600;
        }
        .tab-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--text3);
          flex-shrink: 0;
          transition: background .14s ease;
        }
        .tab.active .tab-dot {
          background: var(--green);
          box-shadow: 0 0 6px rgba(34,197,94,0.5);
        }
        .tab-name {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tab-shell {
          display: none;
        }
        .tab-close {
          width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 5px;
          color: var(--text3);
          font-size: 14px;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity .12s ease, background .12s ease;
        }
        .tab:hover .tab-close,
        .tab.active .tab-close {
          opacity: 1;
        }
        .tab-close:hover {
          background: rgba(0,0,0,0.08);
          color: var(--text);
        }
        .tab-add-wrap {
          flex-shrink: 0;
        }
        .tab-add {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--text3);
          font-size: 18px;
          cursor: pointer;
          transition: background .12s ease, color .12s ease;
        }
        .tab-add:hover {
          background: rgba(0,0,0,0.05);
          color: var(--text);
        }
        .toolbar {
          display: flex;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
        }
        .icon-btn {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--text2);
          cursor: pointer;
          transition: background .12s ease, color .12s ease;
        }
        .icon-btn:hover {
          background: rgba(0,0,0,0.05);
          color: var(--text);
        }
        .icon-btn.active {
          color: var(--accent);
          background: var(--accent-dim);
        }
      `}</style>
    </div>
  );
}
