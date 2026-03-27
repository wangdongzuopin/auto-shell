import React from 'react';
import { useTheme } from '../../hooks/useTheme';

export function ThemeSelector() {
  const { currentTheme, applyTheme, getBuiltInThemes } = useTheme();
  const themes = getBuiltInThemes();

  return (
    <div className="theme-selector">
      <div className="settings-section">
        <div className="section-title">主题</div>
        <div className="theme-grid">
          {themes.map(theme => (
            <div
              key={theme.name}
              className={`theme-swatch ${currentTheme.name === theme.name ? 'active' : ''}`}
              onClick={() => applyTheme(theme)}
            >
              <div className="swatch-preview" style={{ background: theme.background }}>
                <div className="swatch-bar" style={{ background: theme.accent, width: '70%' }} />
                <div className="swatch-bar" style={{ background: theme.foreground, width: '50%', opacity: 0.5 }} />
              </div>
              <div className="swatch-name">{theme.name}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .theme-selector { }
        .settings-section { margin-bottom: 22px; }
        .section-title {
          font-size: 10px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--text3);
          font-weight: 500;
          margin-bottom: 10px;
        }
        .theme-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .theme-swatch {
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
          border: 2px solid transparent;
          transition: border-color .12s;
        }
        .theme-swatch:hover { border-color: var(--border2); }
        .theme-swatch.active { border-color: var(--accent); }
        .swatch-preview {
          height: 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 6px 8px;
          gap: 4px;
        }
        .swatch-bar { height: 3px; border-radius: 2px; }
        .swatch-name {
          font-size: 10px;
          color: var(--text2);
          padding: 4px 8px;
          background: var(--bg3);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
