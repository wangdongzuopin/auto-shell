import React from 'react';

export function TitleBar() {
  return (
    <div className="title-bar">
      <div className="title-bar-drag">
        <span className="title-main">Auto Shell</span>
        <span className="title-sub">AI Native Terminal</span>
      </div>
      <div className="title-bar-controls">
        <button className="title-bar-btn" onClick={() => window.api.minimizeWindow()} aria-label="最小化">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1 5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
        <button className="title-bar-btn" onClick={() => window.api.maximizeWindow()} aria-label="最大化">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="1.2" y="1.2" width="7.6" height="7.6" stroke="currentColor" strokeWidth="1.1" fill="none" />
          </svg>
        </button>
        <button className="title-bar-btn close" onClick={() => window.api.closeWindow()} aria-label="关闭">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 2 8 8M8 2 2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <style>{`
        .title-bar {
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          height: 34px;
          background: var(--bg2);
          border-bottom: 1px solid var(--border);
          -webkit-app-region: drag;
          user-select: none;
        }
        .title-bar-drag {
          display: flex;
          align-items: center;
          padding-left: 16px;
          flex: 1;
          min-width: 0;
        }
        .title-main {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: var(--text);
        }
        .title-sub {
          display: none;
        }
        .title-bar-controls {
          display: flex;
          -webkit-app-region: no-drag;
          padding-right: 2px;
        }
        .title-bar-btn {
          width: 46px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--text2);
          cursor: pointer;
          transition: background .14s ease, color .14s ease;
        }
        .title-bar-btn:hover {
          background: color-mix(in srgb, var(--bg3) 88%, white 12%);
          color: var(--text);
        }
        .title-bar-btn.close:hover {
          background: #c42b1c;
          color: white;
        }
      `}</style>
    </div>
  );
}
