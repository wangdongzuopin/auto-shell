import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settings';
import { ToggleRow } from './index';

export function ThemeSelector() {
  const { currentTheme, applyTheme, getBuiltInThemes } = useTheme();
  const themes = getBuiltInThemes();
  const appearance = useSettingsStore((state) => state.appearance);
  const setAppearance = useSettingsStore((state) => state.setAppearance);

  return (
    <div className="theme-selector">
      <div className="settings-section">
        <div className="section-title">主题</div>
        <div className="theme-grid">
          {themes.map((theme) => (
            <button
              key={theme.name}
              className={`theme-swatch ${currentTheme.name === theme.name ? 'active' : ''}`}
              onClick={() => applyTheme(theme)}
            >
              <div className="swatch-preview" style={{ background: theme.background }}>
                <div className="swatch-bar" style={{ background: theme.accent, width: '72%' }} />
                <div className="swatch-bar" style={{ background: theme.foreground, width: '48%', opacity: 0.52 }} />
              </div>
              <div className="swatch-name">{theme.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="section-title">终端透明度</div>
        <ToggleRow
          label="启用半透明背景"
          checked={appearance.terminalTransparency}
          onChange={(v) => setAppearance({ ...appearance, terminalTransparency: v })}
        />
        {appearance.terminalTransparency && (
          <>
            <div className="slider-row">
              <span className="slider-label">透明度</span>
              <input
                type="range"
                min="30"
                max="100"
                value={appearance.terminalOpacity * 100}
                onChange={(e) => setAppearance({ ...appearance, terminalOpacity: Number(e.target.value) / 100 })}
              />
              <span className="slider-value">{Math.round(appearance.terminalOpacity * 100)}%</span>
            </div>
            <ToggleRow
              label="毛玻璃效果"
              checked={appearance.terminalBackdrop}
              onChange={(v) => setAppearance({ ...appearance, terminalBackdrop: v })}
            />
          </>
        )}
      </div>

      <style>{`
        .theme-selector { display: flex; flex-direction: column; gap: 16px; }
        .settings-section { display: flex; flex-direction: column; gap: 12px; }
        .section-title {
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--text3);
          font-weight: 700;
        }
        .theme-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .theme-swatch {
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.03);
          padding: 0;
        }
        .theme-swatch:hover {
          border-color: rgba(76,141,255,0.28);
        }
        .theme-swatch.active {
          border-color: rgba(76,141,255,0.48);
          box-shadow: inset 0 0 0 1px rgba(76,141,255,0.12);
        }
        .swatch-preview {
          height: 56px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 8px 10px;
          gap: 6px;
        }
        .swatch-bar {
          height: 4px;
          border-radius: 999px;
        }
        .swatch-name {
          font-size: 11px;
          color: var(--text2);
          padding: 8px 10px 10px;
          text-align: left;
        }
        .slider-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
        }
        .slider-label {
          font-size: 12px;
          color: var(--text2);
          min-width: 56px;
        }
        .slider-row input[type="range"] {
          flex: 1;
          accent-color: var(--accent);
        }
        .slider-value {
          font-size: 11px;
          color: var(--text3);
          font-family: var(--mono);
          min-width: 36px;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
