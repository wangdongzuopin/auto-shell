import React, { useEffect, useRef, useState } from 'react';
import { shellNames, shellOptions, useTabsStore } from '../../store/tabs';

interface TabBarProps {
  onOpenChat: () => void;
  onOpenSettings: () => void;
}

export function TabBar({ onOpenChat, onOpenSettings }: TabBarProps) {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab, toggleSidebar } = useTabsStore();
  const sidebarOpen = useTabsStore((state) => state.sidebarOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || addButtonRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const handleCloseTab = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    closeTab(id);
  };

  const handleCreateTab = (shell: (typeof shellOptions)[number]['id']) => {
    addTab(shell);
    setMenuOpen(false);
  };

  return (
    <div id="tabbar">
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={`${tab.name} · ${shellNames[tab.shell]}`}
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
            ref={addButtonRef}
            className={`tab-add ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen((current) => !current)}
            title="新建终端"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            +
          </button>
          {menuOpen && (
            <div className="shell-menu" ref={menuRef} role="menu">
              {shellOptions.map((option) => (
                <button
                  key={option.id}
                  className="shell-menu-item"
                  onClick={() => handleCreateTab(option.id)}
                  role="menuitem"
                >
                  <span className="shell-menu-title">{option.label}</span>
                  <span className="shell-menu-desc">{option.description}</span>
                </button>
              ))}
            </div>
          )}
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
        <button className="icon-btn" onClick={onOpenChat} title="AI 对话">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 4.25C3 3.56 3.56 3 4.25 3h7.5C12.44 3 13 3.56 13 4.25v5.5c0 .69-.56 1.25-1.25 1.25H7l-2.75 2v-2H4.25C3.56 11 3 10.44 3 9.75v-5.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M5.5 6.25h5M5.5 8.25h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
        <button className="icon-btn" onClick={onOpenSettings} title="模型配置">
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
          padding: 0 10px 0 12px;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0));
          border-bottom: 1px solid var(--border);
          user-select: none;
        }
        .tabs {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          overflow: hidden;
        }
        .tab,
        .tab-add,
        .icon-btn,
        .shell-menu-item {
          border: 1px solid transparent;
          background: transparent;
        }
        .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 30px;
          padding: 0 12px;
          border-radius: 8px 8px 0 0;
          font-size: 12px;
          font-family: var(--sans);
          color: var(--text2);
          cursor: pointer;
          white-space: nowrap;
          min-width: 0;
        }
        .tab:hover {
          background: rgba(255,255,255,0.03);
          color: var(--text);
        }
        .tab.active {
          background: var(--bg);
          color: var(--text);
          border-color: var(--border);
          border-bottom-color: var(--bg);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .tab-dot {
          width: 7px;
          height: 7px;
          border-radius: 2px;
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
          background: rgba(255,255,255,0.05);
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
          background: rgba(255,255,255,0.06);
          color: var(--text);
        }
        .tab-add-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .tab-add,
        .icon-btn {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: var(--text2);
          cursor: pointer;
        }
        .tab-add:hover,
        .tab-add.active,
        .icon-btn:hover {
          background: rgba(255,255,255,0.04);
          border-color: var(--border);
          color: var(--text);
        }
        .shell-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: 240px;
          padding: 8px;
          background: rgba(18, 23, 31, 0.98);
          border: 1px solid var(--border2);
          border-radius: 12px;
          box-shadow: var(--shadow-soft);
          z-index: 20;
        }
        .shell-menu-item {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 3px;
          padding: 10px 12px;
          border-radius: 10px;
          color: var(--text);
          cursor: pointer;
          text-align: left;
        }
        .shell-menu-item:hover {
          background: rgba(76,141,255,0.08);
          border-color: rgba(76,141,255,0.18);
        }
        .shell-menu-title {
          font-size: 12px;
          font-weight: 600;
        }
        .shell-menu-desc {
          font-size: 11px;
          color: var(--text3);
          line-height: 1.45;
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
