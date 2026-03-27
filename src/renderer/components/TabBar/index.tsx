import React from 'react';
import { useTabsStore } from '../../store/tabs';

interface TabBarProps {
  onSettings: () => void;
}

export function TabBar({ onSettings }: TabBarProps) {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab, toggleSidebar } = useTabsStore();
  const sidebarOpen = useTabsStore(s => s.sidebarOpen);

  const handleCloseTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    closeTab(id);
  };

  return (
    <div id="tabbar">
      <div className="traffic-lights">
        <div className="tl tl-c" />
        <div className="tl tl-m" />
        <div className="tl tl-x" />
      </div>
      <div className="tabs">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-dot" />
            <span className="tab-name">{tab.name}</span>
            <span className="tab-close" onClick={(e) => handleCloseTab(e, tab.id)}>×</span>
          </div>
        ))}
        <div className="tab-add" onClick={() => addTab()}>+</div>
      </div>
      <div className="tbr">
        <div
          className={`icon-btn ${sidebarOpen ? 'active' : ''}`}
          onClick={toggleSidebar}
          title="快捷命令 Ctrl+Shift+P"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <rect x="2" y="3" width="11" height="1.5" rx=".75" fill="currentColor"/>
            <rect x="2" y="6.75" width="7" height="1.5" rx=".75" fill="currentColor"/>
            <rect x="2" y="10.5" width="9" height="1.5" rx=".75" fill="currentColor"/>
          </svg>
        </div>
        <div className="icon-btn" onClick={onSettings} title="AI 设置">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M5 7.5h5M7.5 5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <style>{`
        #tabbar {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 0 8px;
          background: var(--bg2);
          border-bottom: 1px solid var(--border);
          user-select: none;
        }
        .traffic-lights { display: flex; gap: 6px; margin-right: 12px; }
        .tl { width: 12px; height: 12px; border-radius: 50%; cursor: pointer; }
        .tl-c { background: #ff5f57; }
        .tl-m { background: #febc2e; }
        .tl-x { background: #28c840; }
        .tabs { display: flex; align-items: center; gap: 2px; flex: 1; overflow: hidden; }
        .tab {
          display: flex;
          align-items: center;
          gap: 7px;
          height: 28px;
          padding: 0 12px;
          border-radius: 6px;
          font-size: 12px;
          font-family: var(--mono);
          color: var(--text2);
          cursor: pointer;
          transition: background .12s, color .12s;
          white-space: nowrap;
          border: 1px solid transparent;
        }
        .tab:hover { background: var(--bg3); color: var(--text); }
        .tab.active { background: var(--bg4); color: var(--text); border-color: var(--border2); }
        .tab-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
        .tab-name { }
        .tab-close {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text3);
          font-size: 12px;
          transition: background .1s, color .1s;
        }
        .tab-close:hover { background: rgba(255,255,255,0.1); color: var(--text); }
        .tab-add {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          color: var(--text2);
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          transition: background .12s, color .12s;
        }
        .tab-add:hover { background: var(--bg3); color: var(--text); }
        .tbr { display: flex; align-items: center; gap: 2px; margin-left: auto; }
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
          position: relative;
        }
        .icon-btn:hover { background: var(--bg3); color: var(--text); }
        .icon-btn.active { background: var(--bg3); color: var(--accent); }
        .icon-btn .badge {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
        }
      `}</style>
    </div>
  );
}