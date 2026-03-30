import React, { useEffect, useState } from 'react';
import { useAIStore } from '../../store/ai';

export function AICard() {
  const [open, setOpen] = useState(true);
  const { currentError, errorAnalysis, errorLoading, setErrorCard } = useAIStore();
  const [displayReason, setDisplayReason] = useState('');
  const [displayFixes, setDisplayFixes] = useState<{ description: string; command: string }[]>([]);

  useEffect(() => {
    if (!errorAnalysis) return;
    setDisplayReason(errorAnalysis.reason);
    setDisplayFixes(errorAnalysis.fixes);
  }, [errorAnalysis]);

  if (!currentError) return null;

  const handleInject = (command: string) => {
    console.log('Inject command:', command);
  };

  return (
    <div className="ai-card">
      <div className="ai-card-head" onClick={() => setOpen(!open)}>
        <div className="ai-tag">
          <div className="ai-dot" />
          AI 分析
        </div>
        <span className="ai-card-title">
          {displayReason || '正在分析报错原因...'}
        </span>
        <span className={`ai-chevron ${open ? 'open' : ''}`}>▼</span>
      </div>
      {open && (
        <div className="ai-card-body">
          {displayReason && <div className="ai-reason">{displayReason}</div>}
          {displayFixes.length > 0 && (
            <div className="ai-fixes">
              {displayFixes.map((fix, index) => (
                <div key={`${fix.command}-${index}`} className="ai-fix">
                  <span className="fix-num">{index + 1}</span>
                  <span className="fix-desc">{fix.description}</span>
                  <span className="fix-cmd">{fix.command}</span>
                  <button className="fix-run" onClick={() => handleInject(fix.command)}>
                    执行
                  </button>
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
          <button className="ai-close" onClick={() => setErrorCard(false)}>
            关闭
          </button>
        </div>
      )}
      <style>{`
        .ai-card {
          margin: 8px 0 4px;
          border: 1px solid var(--ai-border);
          border-radius: 10px;
          background: linear-gradient(180deg, rgba(76,141,255,0.08), rgba(76,141,255,0.03));
          overflow: hidden;
          font-family: var(--sans);
          box-shadow: var(--shadow-soft);
        }
        .ai-card-head {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          cursor: pointer;
          user-select: none;
        }
        .ai-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: var(--accent);
        }
        .ai-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
        }
        .ai-card-title {
          flex: 1;
          font-size: 12px;
          color: var(--text2);
        }
        .ai-chevron {
          color: var(--text3);
          font-size: 11px;
          transition: transform .18s ease;
        }
        .ai-chevron.open { transform: rotate(180deg); }
        .ai-card-body {
          padding: 0 14px 14px;
          border-top: 1px solid var(--ai-border);
        }
        .ai-reason {
          font-size: 12.5px;
          color: var(--text);
          line-height: 1.6;
          padding: 12px 0 10px;
        }
        .ai-fixes {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ai-fix {
          display: grid;
          grid-template-columns: 28px 1fr minmax(120px, 220px) auto;
          gap: 10px;
          align-items: center;
          background: rgba(15, 17, 21, 0.8);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 9px 10px;
        }
        .fix-num {
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(76,141,255,0.16);
          color: var(--accent);
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
        }
        .fix-desc {
          font-size: 12px;
          color: var(--text);
        }
        .fix-cmd {
          font-family: var(--mono);
          font-size: 11px;
          color: #8cb3ff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .fix-run,
        .ai-close {
          border: 1px solid var(--border2);
          background: var(--bg3);
          color: var(--text);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 11px;
          cursor: pointer;
        }
        .fix-run:hover,
        .ai-close:hover {
          border-color: rgba(76,141,255,0.5);
          color: white;
        }
        .ai-close {
          margin-top: 12px;
        }
        .ai-loading {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 14px 0 6px;
        }
        .loading-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--accent);
          animation: bounce 1.2s ease-in-out infinite;
        }
        .loading-dot:nth-child(2) { animation-delay: 0.15s; }
        .loading-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
