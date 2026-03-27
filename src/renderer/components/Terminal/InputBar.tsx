import React, { useState, useRef } from 'react';
import { useAIStore } from '../../store/ai';
import { useAI } from '../../hooks/useAI';

interface InputBarProps {
  tabId: string;
  shell: 'powershell' | 'cmd' | 'wsl' | 'git-bash';
}

export function InputBar({ tabId, shell }: InputBarProps) {
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);

  const { nlMode, nlSuggestion, nlLoading, setNLMode } = useAIStore();
  const { naturalToCommand } = useAI();

  const handleChange = async (val: string) => {
    setValue(val);

    if (val.startsWith('#') && val.length > 2) {
      const query = val.slice(1).trim();
      await naturalToCommand(query, shell);
    } else if (val === '#') {
      setNLMode(true, '');
    } else if (!val.startsWith('#')) {
      setNLMode(false);
    }
  };

  const handleSubmit = () => {
    if (!value.trim()) return;

    if (nlMode && nlSuggestion) {
      // In NL mode, fill the command but don't execute
      setValue(nlSuggestion);
      setNLMode(false);
      return;
    }

    // Add to history
    setHistory(h => [value, ...h].slice(0, 50));
    setHistIdx(-1);

    // Send to PTY
    window.api.writePty(tabId, value + '\r');
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const newIdx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(newIdx);
      setValue(history[newIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx <= 0) {
        setHistIdx(-1);
        setValue('');
      } else {
        const newIdx = histIdx - 1;
        setHistIdx(newIdx);
        setValue(history[newIdx] || '');
      }
    } else if (e.key === 'Escape') {
      setNLMode(false);
      setValue('');
    }
  };

  return (
    <div className="input-area">
      {nlMode && nlSuggestion && (
        <div className="nl-suggestion">
          <span className="nl-label">AI 生成</span>
          <span className="nl-cmd">{nlSuggestion}</span>
          <span className="nl-hint">Enter 确认 · Esc 取消</span>
        </div>
      )}
      <div className="input-row">
        <span className={`input-prompt ${nlMode ? 'nl' : ''}`}>
          {nlMode ? '#' : '❯'}
        </span>
        <input
          className="cmd-input"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={nlMode ? '输入自然语言描述...' : '输入命令，或 # 开头用自然语言描述…'}
          autoFocus
        />
      </div>
      {nlLoading && (
        <div className="input-hint">AI 正在生成命令…</div>
      )}
      <style>{`
        .input-area { padding: 10px 20px 14px; border-top: 1px solid var(--border); }
        .input-row { display: flex; align-items: center; gap: 0; }
        .input-prompt {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13.5px;
          color: var(--accent);
          margin-right: 10px;
          user-select: none;
          flex-shrink: 0;
          transition: color .15s;
        }
        .input-prompt.nl { color: var(--yellow); }
        .cmd-input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: var(--text);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13.5px;
          line-height: 1.65;
          caret-color: var(--accent);
        }
        .cmd-input::placeholder { color: var(--text3); }
        .input-hint { font-size: 11px; color: var(--text3); margin-top: 4px; padding-left: 22px; }
        .nl-suggestion {
          margin: 0 0 6px;
          padding: 8px 12px;
          background: var(--bg3);
          border: 1px solid var(--border2);
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .nl-label { font-size: 11px; color: var(--accent); font-weight: 500; white-space: nowrap; }
        .nl-cmd { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nl-hint { font-size: 11px; color: var(--text3); white-space: nowrap; }
      `}</style>
    </div>
  );
}
