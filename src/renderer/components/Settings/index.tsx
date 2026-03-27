import React, { useState } from 'react';
import { AIProviders } from './AIProviders';
import { ThemeSelector } from './ThemeSelector';
import { FeatureToggles } from './FeatureToggles';

interface SettingsProps {
  open: boolean;
  defaultTab?: 'appearance' | 'ai' | 'system';
  onClose: () => void;
}

export function Settings({ open, defaultTab = 'ai', onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'appearance' | 'ai' | 'system'>(defaultTab);

  if (!open) return null;

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <span className="settings-title">
          {activeTab === 'ai' ? 'AI 设置' : activeTab === 'appearance' ? '外观' : '系统集成'}
        </span>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          外观
        </button>
        <button
          className={`settings-tab ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI 设置
        </button>
        <button
          className={`settings-tab ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          系统集成
        </button>
      </div>
      <div className="settings-body">
        {activeTab === 'appearance' && <ThemeSelector />}
        {activeTab === 'ai' && <AIProviders />}
        {activeTab === 'system' && <SystemSettings />}
      </div>
      <style>{`
        .settings-panel {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 300px;
          background: var(--bg2);
          border-left: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 10;
        }
        .settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
        }
        .settings-title { font-size: 13px; font-weight: 500; }
        .close-btn {
          background: none;
          border: none;
          color: var(--text2);
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        .close-btn:hover { color: var(--text); }
        .settings-tabs {
          display: flex;
          gap: 2px;
          padding: 8px 10px;
          border-bottom: 1px solid var(--border);
        }
        .settings-tab {
          flex: 1;
          text-align: center;
          padding: 5px;
          border-radius: 5px;
          font-size: 12px;
          color: var(--text2);
          background: none;
          border: none;
          cursor: pointer;
          transition: background .1s, color .1s;
        }
        .settings-tab:hover { background: var(--bg3); color: var(--text); }
        .settings-tab.active { background: var(--bg3); color: var(--text); }
        .settings-body { flex: 1; overflow-y: auto; padding: 12px 16px; }
      `}</style>
    </div>
  );
}

function SystemSettings() {
  const [toggles, setToggles] = useState({
    contextMenu: true,
    darkMode: true,
    notifications: true,
    jumpList: true
  });

  return (
    <div className="system-settings">
      <div className="settings-section">
        <div className="section-title">Windows 集成</div>
        <ToggleRow label="右键菜单" checked={toggles.contextMenu} onChange={(v) => setToggles(s => ({...s, contextMenu: v}))} />
        <ToggleRow label="跟随系统深色模式" checked={toggles.darkMode} onChange={(v) => setToggles(s => ({...s, darkMode: v}))} />
        <ToggleRow label="命令完成通知（>10s）" checked={toggles.notifications} onChange={(v) => setToggles(s => ({...s, notifications: v}))} />
        <ToggleRow label="任务栏跳转列表" checked={toggles.jumpList} onChange={(v) => setToggles(s => ({...s, jumpList: v}))} />
      </div>
      <style>{`
        .system-settings { }
        .settings-section { margin-bottom: 22px; }
        .section-title {
          font-size: 10px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--text3);
          font-weight: 500;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
}

export function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <span className="toggle-label">{label}</span>
      <div
        className={`toggle ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
      >
        <div className="toggle-knob" />
      </div>
      <style>{`
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid var(--border);
        }
        .toggle-row:last-child { border-bottom: none; }
        .toggle-label { font-size: 12px; color: var(--text2); }
        .toggle {
          width: 32px;
          height: 18px;
          background: var(--bg4);
          border-radius: 9px;
          position: relative;
          cursor: pointer;
          transition: background .2s;
          border: 1px solid var(--border2);
        }
        .toggle.on { background: var(--accent); border-color: var(--accent); }
        .toggle-knob {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          transition: transform .2s;
        }
        .toggle.on .toggle-knob { transform: translateX(14px); }
      `}</style>
    </div>
  );
}
