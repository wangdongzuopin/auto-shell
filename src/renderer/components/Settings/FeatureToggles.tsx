import React from 'react';
import { useSettingsStore } from '../../store/settings';

export function FeatureToggles() {
  const { features, setFeatures } = useSettingsStore();

  const toggles = [
    { key: 'errorCard', label: '报错智能解析卡片' },
    { key: 'naturalCommand', label: '自然语言转命令（#）' },
    { key: 'explainCommand', label: '命令解释悬浮卡' },
    { key: 'completion', label: '上下文感知补全' }
  ] as const;

  return (
    <div className="feature-toggles">
      {toggles.map(t => (
        <div key={t.key} className="toggle-row">
          <span className="toggle-label">{t.label}</span>
          <div
            className={`toggle ${features[t.key] ? 'on' : ''}`}
            onClick={() => setFeatures({ [t.key]: !features[t.key] })}
          >
            <div className="toggle-knob" />
          </div>
        </div>
      ))}
      <style>{`
        .feature-toggles { }
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
