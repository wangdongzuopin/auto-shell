import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAIStore } from '../../store/ai';
import { useSettingsStore } from '../../store/settings';
import { shellNames, useTabsStore } from '../../store/tabs';
import { useTerminal } from '../../hooks/useTerminal';
import { AICard } from '../AICard';
import { ExplainTooltip } from '../ExplainTooltip';
import { CommandProgressBar } from '../CommandProgressBar';
import { useCommandProgress } from '../../hooks/useCommandProgress';

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ text: string; position: { x: number; y: number } } | null>(null);
  const { progress, isVisible, startTracking, complete } = useCommandProgress();

  const activeTabId = useTabsStore((state) => state.activeTabId);
  const tabs = useTabsStore((state) => state.tabs);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const errorCardOpen = useAIStore((state) => state.errorCardOpen);
  const theme = useSettingsStore((state) => state.theme);

  const handleSelectionChange = useCallback((selection: string, position: { x: number; y: number }) => {
    setTooltip({ text: selection, position });
  }, []);

  const { focus } = useTerminal(
    containerRef,
    activeTabId || '1',
    activeTab?.shell,
    activeTab?.cwd,
    theme,
    handleSelectionChange,
    startTracking,
    complete
  );

  useEffect(() => {
    setTooltip(null);
  }, [activeTabId]);

  if (!activeTab) {
    return <div className="terminal-empty">没有活动终端</div>;
  }

  return (
    <div className="terminal-container">
      <div className="shell-bar">
        <div className="shell-chip active">
          <div className="shell-dot" />
          {activeTab.name}
        </div>
        <div className="shell-meta">
          <span className="shell-kind">{shellNames[activeTab.shell]}</span>
          <span className="shell-hint">直接在终端中输入命令</span>
          <span className="shell-path">{activeTab.cwd === '~' ? '默认目录' : activeTab.cwd}</span>
        </div>
      </div>
      <div
        className="terminal-output"
        ref={containerRef}
        tabIndex={0}
        onMouseDown={() => focus()}
        onFocus={() => focus()}
      />
      {isVisible && progress && (
        <CommandProgressBar progress={progress} />
      )}
      {errorCardOpen && <AICard />}
      {tooltip && (
        <ExplainTooltip
          selectedText={tooltip.text}
          position={tooltip.position}
          onClose={() => setTooltip(null)}
        />
      )}
      <style>{`
        .terminal-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--bg);
          overflow: hidden;
          position: relative;
        }
        .shell-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 18px;
          min-height: 38px;
          border-bottom: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg2) 88%, white 12%);
        }
        .shell-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-family: var(--mono);
          color: var(--text);
          border: 1px solid rgba(76,141,255,0.2);
          background: rgba(76,141,255,0.08);
        }
        .shell-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--green);
        }
        .shell-meta {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .shell-kind {
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(76,141,255,0.08);
          border: 1px solid rgba(76,141,255,0.18);
          color: var(--accent);
          font-size: 10px;
          font-family: var(--mono);
          flex-shrink: 0;
        }
        .shell-hint {
          font-size: 11px;
          color: var(--text3);
          white-space: nowrap;
        }
        .shell-path {
          font-size: 11px;
          color: var(--text3);
          font-family: var(--mono);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .terminal-output {
          flex: 1;
          padding: 14px 18px;
          overflow: hidden;
          cursor: text;
          background: var(--bg);
        }
        .terminal-output .xterm {
          height: 100%;
        }
        .terminal-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text2);
        }
      `}</style>
    </div>
  );
}
