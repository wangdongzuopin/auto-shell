import React, { useState, useEffect } from 'react';
import { useAIStore } from '../../store/ai';

export function AICard() {
  const [open, setOpen] = useState(true);
  const {
    currentError,
    errorStreaming,
    errorAnalysis,
    errorLoading,
    setErrorCard
  } = useAIStore();

  // Try to parse streaming content into analysis
  const [displayReason, setDisplayReason] = useState('');
  const [displayFixes, setDisplayFixes] = useState<{ description: string; command: string }[]>([]);

  useEffect(() => {
    if (!errorStreaming) return;

    // Try to find complete JSON in streaming
    const jsonMatch = errorStreaming.match(/\{[\s\S]*\}\s*$/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.reason) setDisplayReason(parsed.reason);
        if (parsed.fixes) setDisplayFixes(parsed.fixes);
      } catch {
        // Not valid JSON yet, show partial
        if (errorStreaming.length > 20) {
          setDisplayReason('正在分析错误原因...');
        }
      }
    }
  }, [errorStreaming]);

  useEffect(() => {
    if (errorAnalysis) {
      setDisplayReason(errorAnalysis.reason);
      setDisplayFixes(errorAnalysis.fixes);
    }
  }, [errorAnalysis]);

  if (!currentError) return null;

  const handleInject = (command: string) => {
    // This would typically use a callback to fill the input
    console.log('Inject command:', command);
  };

  const handleClose = () => {
    setErrorCard(false);
  };

  return (
    <div className="ai-card">
      <div className="ai-card-head" onClick={() => setOpen(!open)}>
        <div className="ai-tag">
          <div className="ai-dot" />
          AI 解析
        </div>
        <span className="ai-card-title">
          {displayReason || '正在分析错误原因...'}
        </span>
        <span className={`ai-chevron ${open ? 'open' : ''}`}>▾</span>
      </div>
      {open && (
        <div className="ai-card-body">
          {displayReason && (
            <div className="ai-reason">{displayReason}</div>
          )}
          {displayFixes.length > 0 && (
            <div className="ai-fixes">
              {displayFixes.map((fix, i) => (
                <div key={i} className="ai-fix">
                  <span className="fix-num">{['①', '②', '③', '④', '⑤'][i] || (i + 1)}</span>
                  <span className="fix-desc">{fix.description}</span>
                  <span className="fix-cmd">{fix.command}</span>
                  <span className="fix-run" onClick={() => handleInject(fix.command)}>执行</span>
                </div>
              ))}
            </div>
          )}
          {errorLoading && !displayReason && (
            <div className="ai-loading">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
          )}
        </div>
      )}
      <style>{`
        .ai-card {
          margin: 8px 0 4px;
          border: 1px solid var(--ai-border);
          border-radius: 8px;
          background: var(--ai-bg);
          overflow: hidden;
          font-family: var(--sans);
        }
        .ai-card-head {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          cursor: pointer;
          user-select: none;
          transition: background .1s;
        }
        .ai-card-head:hover { background: rgba(124,106,247,0.06); }
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
        .ai-card-title {
          font-size: 12px;
          color: var(--text2);
          flex: 1;
        }
        .ai-chevron {
          color: var(--text3);
          font-size: 11px;
          transition: transform .2s;
        }
        .ai-chevron.open { transform: rotate(180deg); }
        .ai-card-body {
          padding: 0 14px 12px;
          border-top: 1px solid var(--ai-border);
        }
        .ai-reason {
          font-size: 12.5px;
          color: var(--text);
          line-height: 1.6;
          padding: 10px 0 8px;
        }
        .ai-fixes { display: flex; flex-direction: column; gap: 6px; }
        .ai-fix {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 7px 10px;
        }
        .fix-num { font-size: 11px; color: var(--text3); min-width: 14px; }
        .fix-desc { font-size: 12px; color: var(--text2); flex: 1; }
        .fix-cmd {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--accent);
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .fix-run {
          font-size: 11px;
          color: var(--bg);
          background: var(--accent);
          padding: 3px 10px;
          border-radius: 4px;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity .12s;
          flex-shrink: 0;
        }
        .fix-run:hover { opacity: .85; }
        .ai-loading { display: flex; justify-content: center; gap: 6px; padding: 10px; }
        .loading-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          animation: bounce 1.4s ease-in-out infinite both;
        }
        .loading-dot:nth-child(1) { animation-delay: -0.32s; }
        .loading-dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}</style>
    </div>
  );
}
