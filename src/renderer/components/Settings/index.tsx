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
          <div className="settings-subtitle">统一管理主题、模型提供商和运行方式。</div>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="关闭设置">×</button>
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
          background: linear-gradient(180deg, color-mix(in srgb, var(--bg2) 88%, white 12%), var(--bg));
          border: 1px solid var(--border2);
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          z-index: 20;
          box-shadow: 0 28px 80px rgba(0,0,0,0.18);
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
          background: color-mix(in srgb, var(--bg3) 86%, white 14%);
          color: var(--text2);
          font-size: 20px;
          cursor: pointer;
        }
        .close-btn:hover {
          background: var(--bg3);
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
          background: color-mix(in srgb, var(--bg2) 90%, white 10%);
          color: var(--text2);
          border-radius: 10px;
          padding: 10px 0;
          cursor: pointer;
        }
        .settings-tab.active {
          color: var(--text);
          border-color: var(--ai-border);
          background: var(--ai-bg);
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
        <div className="system-title">本地配置缓存</div>
        <div className="system-copy">
          AI 提供商、模型参数、主题与功能开关会持久化到用户目录下的
          <code> ~/.autoshell/config.json </code>
          ，应用启动时会自动读取。
        </div>
      </div>
      <div className="system-card">
        <div className="system-title">跨平台界面</div>
        <div className="system-copy">
          当前界面不再强调 Windows 优先描述，主题与窗口内容统一按全局设计变量渲染，便于继续扩展到 macOS。
        </div>
      </div>
      <div className="system-card">
        <div className="system-title">打包方式</div>
        <div className="system-copy">
          项目已经补上 macOS 打包配置，可在 macOS 环境执行对应打包命令生成安装包。
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
          background: color-mix(in srgb, var(--bg2) 90%, white 10%);
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
        .system-copy code {
          font-family: var(--mono);
          color: var(--text);
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
          background: var(--ai-bg);
          border-color: var(--ai-border);
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
