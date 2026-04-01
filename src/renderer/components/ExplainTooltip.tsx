import React, { useState, useEffect, useRef } from 'react';
import { useAIStore } from '../store/ai';
import { useAI } from '../hooks/useAI';

interface ExplainTooltipProps {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function ExplainTooltip({ selectedText, position, onClose }: ExplainTooltipProps) {
  const { explainResult, explainLoading } = useAIStore();
  const { explainCommand } = useAI();
  const [visible, setVisible] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedText && selectedText.length >= 3) {
      setVisible(true);
    }
  }, [selectedText]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleExplain = async () => {
    await explainCommand(selectedText, position.x, position.y);
  };

  if (!visible) return null;

  return (
    <>
      {/* Toolbar */}
      <div
        className="explain-toolbar"
        style={{ left: position.x, top: position.y + 20 }}
      >
        <button
          className="explain-btn ai"
          onClick={handleExplain}
          disabled={explainLoading}
        >
          {explainLoading ? '分析中...' : '解释'}
        </button>
      </div>

      {/* Popup */}
      {explainResult && (
        <div
          ref={popupRef}
          className="explain-popup"
          style={{ left: position.x, top: position.y + 50 }}
        >
          <div className="ai-tag" style={{ marginBottom: 8 }}>
            <div className="ai-dot" />
            命令解释
          </div>
          <div className="ep-summary">{explainResult.summary}</div>
          <div className="ep-parts">
            {explainResult.parts?.map((part, i) => (
              <div key={i} className="ep-part">
                <span className="ep-token">{part.token}</span>
                <span className="ep-meaning">{part.meaning}</span>
              </div>
            ))}
          </div>
          {explainResult.variants && explainResult.variants.length > 0 && (
            <div className="ep-variants">
              <span className="ep-variant-label">常见变体:</span>
              {explainResult.variants.map((v, i) => (
                <code key={i} className="ep-variant">{v}</code>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .explain-toolbar {
          position: absolute;
          background: var(--bg4);
          border: 1px solid var(--border2);
          border-radius: 6px;
          padding: 4px 6px;
          display: flex;
          gap: 4px;
          z-index: 20;
          pointer-events: all;
        }
        .explain-btn {
          font-size: 11px;
          color: var(--text2);
          padding: 3px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: background .1s, color .1s;
          white-space: nowrap;
          background: none;
          border: none;
        }
        .explain-btn:hover { background: var(--bg5); color: var(--text); }
        .explain-btn.ai { color: #a78bfa; }
        .explain-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .explain-popup {
          position: absolute;
          background: var(--bg4);
          border: 1px solid var(--border2);
          border-radius: 8px;
          padding: 12px 14px;
          z-index: 21;
          min-width: 260px;
          max-width: 360px;
          font-family: var(--sans);
        }
        .ai-tag {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 500;
          color: #a78bfa;
          letter-spacing: .02em;
        }
        .ai-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          animation: pulse 1.5s ease infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        .ep-summary {
          font-size: 12.5px;
          color: var(--text);
          line-height: 1.55;
          margin-bottom: 10px;
        }
        .ep-parts { display: flex; flex-direction: column; gap: 5px; }
        .ep-part { display: flex; gap: 10px; align-items: baseline; }
        .ep-token {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11.5px;
          color: var(--cyan);
          min-width: 90px;
          flex-shrink: 0;
        }
        .ep-meaning {
          font-size: 11.5px;
          color: var(--text2);
          line-height: 1.5;
        }
        .ep-variants {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }
        .ep-variant-label {
          font-size: 11px;
          color: var(--text3);
        }
        .ep-variant {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--accent);
          background: var(--bg3);
          padding: 2px 6px;
          border-radius: 4px;
        }
      `}</style>
    </>
  );
}
