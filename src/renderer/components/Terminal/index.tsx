import React, { useRef, useEffect, useState } from 'react';
import { useTerminal } from '../../hooks/useTerminal';
import { useAIStore } from '../../store/ai';
import { useTabsStore } from '../../store/tabs';
import { InputBar } from './InputBar';
import { AICard } from '../AICard';

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabId = useTabsStore(s => s.activeTabId);
  const tabs = useTabsStore(s => s.tabs);
  const activeTab = tabs.find(t => t.id === activeTabId);

  const { writeOutput, resize } = useTerminal(containerRef, activeTabId || '1');

  const errorCardOpen = useAIStore(s => s.errorCardOpen);

  useEffect(() => {
    // Handle terminal output from PTY
    const handleOutput = (id: string, data: string) => {
      if (id === activeTabId) {
        writeOutput(data);
      }
    };

    window.api.onPtyOutput(handleOutput);

    // Handle window resize
    const handleResize = () => resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTabId, writeOutput, resize]);

  if (!activeTab) {
    return <div className="terminal-empty">No active terminal</div>;
  }

  return (
    <div className="terminal-container">
      <div className="shell-bar">
        <div className="shell-chip active">
          <div className="shell-dot" />
          {activeTab.name}
        </div>
      </div>
      <div className="terminal-output" ref={containerRef} />
      {errorCardOpen && <AICard />}
      <InputBar tabId={activeTab.id} shell={activeTab.shell} />
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
          gap: 8px;
          padding: 0 16px;
          height: 34px;
          border-bottom: 1px solid var(--border);
          background: var(--bg2);
        }
        .shell-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 99px;
          font-size: 11px;
          font-family: var(--mono);
          cursor: pointer;
          transition: background .12s, color .12s;
          color: var(--text2);
          border: 1px solid transparent;
        }
        .shell-chip:hover { background: var(--bg3); color: var(--text); }
        .shell-chip.active { background: var(--bg4); color: var(--text); border-color: var(--border2); }
        .shell-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }
        .terminal-output { flex: 1; padding: 14px 20px 0; font-family: 'IBM Plex Mono', monospace; font-size: 13.5px; line-height: 1.65; overflow-y: auto; }
        .terminal-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text2); }
      `}</style>
    </div>
  );
}
