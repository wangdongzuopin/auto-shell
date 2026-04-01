import { ProgressInfo } from '../hooks/useCommandProgress';

interface CommandProgressBarProps {
  progress: ProgressInfo;
  onCancel?: () => void;
}

export function CommandProgressBar({ progress, onCancel }: CommandProgressBarProps) {
  const { command, type, elapsed, progress: percent, output, isComplete } = progress;

  const typeIcons: Record<string, string> = {
    install: '📦',
    download: '⬇️',
    build: '🔨',
    git: '📂',
    docker: '🐳',
    general: '⏳',
  };

  const typeLabels: Record<string, string> = {
    install: '安装中',
    download: '下载中',
    build: '构建中',
    git: 'Git 操作中',
    docker: 'Docker 操作中',
    general: '执行中',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid #334155',
        padding: '8px 12px',
        zIndex: 100,
        fontFamily: 'monospace',
        fontSize: '13px',
      }}
    >
      {/* 标题行 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ marginRight: '8px' }}>{typeIcons[type]}</span>
        <span style={{ color: '#f1f5f9' }}>
          {typeLabels[type]} {command.slice(0, 40)}
          {command.length > 40 ? '...' : ''}
        </span>
        <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>
          ⏱ {elapsed}s
        </span>
        {!isComplete && (
          <button
            onClick={onCancel}
            style={{
              marginLeft: '8px',
              padding: '2px 6px',
              background: '#374151',
              border: 'none',
              borderRadius: '4px',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            取消
          </button>
        )}
        {isComplete && (
          <span style={{ marginLeft: '8px', color: '#22c55e' }}>✓</span>
        )}
      </div>

      {/* 进度条 */}
      <div
        style={{
          height: '4px',
          background: '#334155',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            background: isComplete
              ? '#22c55e'
              : percent < 30
                ? '#3b82f6'
                : percent < 70
                  ? '#f59e0b'
                  : '#22c55e',
            borderRadius: '2px',
            transition: 'width 0.3s ease, background 0.3s ease',
          }}
        />
      </div>

      {/* 最新输出预览 */}
      {output.length > 0 && (
        <div
          style={{
            marginTop: '4px',
            color: '#64748b',
            fontSize: '11px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {output[output.length - 1]}
        </div>
      )}
    </div>
  );
}
