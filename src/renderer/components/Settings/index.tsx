import React, { useEffect, useState } from 'react';
import { ThemeSelector } from './ThemeSelector';
import { AIProviders } from './AIProviders';

interface SettingsProps {
  open: boolean;
  defaultTab?: 'appearance' | 'ai' | 'system';
  onClose: () => void;
}

export function Settings({ open, defaultTab = 'ai', onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'appearance' | 'ai' | 'system'>(defaultTab);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, open]);

  if (!open) return null;

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <div>
          <div className="settings-title">
            {activeTab === 'ai' ? 'AI 与模型' : activeTab === 'appearance' ? '外观主题' : '系统偏好'}
          </div>
          <div className="settings-subtitle">调整终端样式、模型供应商和辅助能力。</div>
        </div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="settings-tabs">
        <button className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveTab('appearance')}>
          外观
        </button>
        <button className={`settings-tab ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
          AI
        </button>
        <button className={`settings-tab ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>
          系统
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
          top: 16px;
          right: 16px;
          bottom: 16px;
          width: min(420px, calc(100vw - 32px));
          background: linear-gradient(180deg, rgba(19,25,36,0.98), rgba(12,16,24,0.98));
          border: 1px solid var(--border2);
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          z-index: 20;
          box-shadow: 0 28px 80px rgba(0,0,0,0.45);
          overflow: hidden;
        }
        .settings-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--border);
        }
        .settings-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
        }
        .settings-subtitle {
          margin-top: 6px;
          font-size: 12px;
          color: var(--text2);
        }
        .close-btn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.03);
          color: var(--text2);
          font-size: 20px;
          cursor: pointer;
        }
        .close-btn:hover {
          background: rgba(255,255,255,0.06);
          color: var(--text);
        }
        .settings-tabs {
          display: flex;
          gap: 8px;
          padding: 12px 16px 0;
        }
        .settings-tab {
          flex: 1;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.02);
          color: var(--text2);
          border-radius: 10px;
          padding: 10px 0;
          cursor: pointer;
        }
        .settings-tab.active {
          color: var(--text);
          border-color: rgba(76,141,255,0.35);
          background: rgba(76,141,255,0.08);
        }
        .settings-body {
          flex: 1;
          overflow-y: auto;
          padding: 18px 16px 20px;
        }
      `}</style>
    </div>
  );
}

function SystemSettings() {
  return (
    <div className="system-settings">
      <div className="system-card">
        <div className="system-title">Windows 风格优先</div>
        <div className="system-copy">
          当前版本已移除顶部的 mac 彩色控制按钮，并统一改为更接近 Windows 桌面应用的标题栏和标签视觉。
        </div>
      </div>
      <div className="system-card">
        <div className="system-title">模型配置即时生效</div>
        <div className="system-copy">
          调整 Base URL、模型名或当前 Provider 后，会立即持久化并在下次请求时重建 AI Provider。
        </div>
      </div>
      <style>{`
        .system-settings {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .system-card {
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
          padding: 14px;
        }
        .system-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }
        .system-copy {
          margin-top: 8px;
          font-size: 12px;
          line-height: 1.6;
          color: var(--text2);
        }
      `}</style>
    </div>
  );
}

export function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="toggle-row">
      <span className="toggle-label">{label}</span>
      <button
        className={`toggle ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <div className="toggle-knob" />
      </button>
      <style>{`
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
        }
        .toggle-row:last-child { border-bottom: none; }
        .toggle-label {
          font-size: 12px;
          color: var(--text2);
        }
        .toggle {
          width: 42px;
          height: 24px;
          border-radius: 999px;
          border: 1px solid var(--border2);
          background: var(--bg4);
          padding: 2px;
          cursor: pointer;
        }
        .toggle.on {
          background: rgba(76,141,255,0.22);
          border-color: rgba(76,141,255,0.48);
        }
        .toggle-knob {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          transition: transform .18s ease;
        }
        .toggle.on .toggle-knob {
          transform: translateX(18px);
        }
      `}</style>
    </div>
  );
}
