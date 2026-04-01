import React, { useMemo, useState } from 'react';
import type { ChatMessage } from '../../../shared/types';
import { useAI } from '../../hooks/useAI';
import { shellNames, useTabsStore } from '../../store/tabs';
import { useSettingsStore } from '../../store/settings';
import { toast } from '../Toast';

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
}

type AppPlatform = 'windows' | 'macos' | 'linux';

export function AIChatPanel({ open, onClose }: AIChatPanelProps) {
  const { streamChat } = useAI();
  const provider = useSettingsStore((state) => state.aiSettings.provider);
  const configs = useSettingsStore((state) => state.aiSettings.configs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const tabs = useTabsStore((state) => state.tabs);
  const setTabCwd = useTabsStore((state) => state.setTabCwd);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '我是终端助手。你可以直接问命令、报错原因、脚本写法，也可以让我帮你切换到当前机器上的某个项目目录。'
    }
  ]);
  const [loading, setLoading] = useState(false);

  const platform = useMemo(() => detectPlatform(), []);
  const modelLabel = useMemo(() => `${provider} / ${configs[provider].model}`, [configs, provider]);
  const tabLabel = useMemo(() => {
    if (!activeTab) {
      return '未关联终端';
    }

    return `${shellNames[activeTab.shell]} / ${activeTab.cwd === '~' ? '默认目录' : activeTab.cwd}`;
  }, [activeTab]);

  const placeholder = useMemo(() => {
    return platform === 'windows'
      ? '例如：帮我写一个 PowerShell 脚本，或输入“切换到 D:\\Agent\\auto-shell”'
      : '例如：帮我写一个 zsh 脚本，或输入“切换到 ~/projects/auto-shell”';
  }, [platform]);

  if (!open) return null;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    if (!activeTabId || !activeTab) {
      toast('当前没有可用的终端窗口');
      return;
    }

    const switchTarget = parseProjectSwitchInput(trimmed);
    if (switchTarget) {
      const exists = await window.api.pathExists(switchTarget);
      if (!exists) {
        setMessages((current) => [
          ...current,
          { role: 'user', content: trimmed },
          { role: 'assistant', content: `找不到该目录：${switchTarget}` }
        ]);
        setInput('');
        toast(`目录不存在：${switchTarget}`);
        return;
      }

      const command = buildChangeDirectoryCommand(activeTab.shell, switchTarget);
      window.api.writePty(activeTabId, `${command}\r`);
      setTabCwd(activeTabId, switchTarget);
      setMessages((current) => [
        ...current,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: `已在当前终端执行目录切换：${switchTarget}` }
      ]);
      setInput('');
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const requestMessages: ChatMessage[] = [
        {
          role: 'system',
          content: [
            `你是一个中文终端助手，当前服务的平台是 ${platformLabel(platform)}。`,
            '回答要直接、可执行、准确，优先给出当前平台和当前 shell 可直接执行的命令。',
            `当前 shell: ${shellNames[activeTab.shell]}`,
            `当前工作目录: ${activeTab.cwd}`,
            '如果用户表达的是切换目录或切换项目，优先直接给出明确的 cd / Set-Location 命令。'
          ].join('\n')
        },
        ...nextMessages
      ];

      setMessages((current) => [...current, { role: 'assistant', content: '' }]);

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const cleanup = streamChat(requestMessages, {
          onChunk: (chunk) => {
            setMessages((current) => {
              const next = [...current];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') {
                next[next.length - 1] = {
                  ...last,
                  content: `${last.content}${chunk}`
                };
              }
              return next;
            });
          },
          onDone: () => {
            cleanup();
            if (!settled) {
              settled = true;
              setMessages((current) => {
                const next = [...current];
                const last = next[next.length - 1];
                if (last?.role === 'assistant' && !last.content.trim()) {
                  next[next.length - 1] = {
                    ...last,
                    content: '模型已完成响应，但没有返回可显示的内容。'
                  };
                }
                return next;
              });
              resolve();
            }
          },
          onError: (message) => {
            cleanup();
            if (!settled) {
              settled = true;
              reject(new Error(message));
            }
          }
        });
      });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'AI 对话失败';
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: `调用模型失败：${message}`
        }
      ]);
      toast(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div>
          <div className="chat-title">Assistant</div>
          <div className="chat-meta">{modelLabel}</div>
          <div className="chat-context">{tabLabel}</div>
        </div>
        <button className="chat-close" onClick={onClose}>×</button>
      </div>
      <div className="chat-messages">
        {messages.map((message, index) => {
          const previous = index > 0 ? messages[index - 1] : null;
          const showAssistantHeader = message.role === 'assistant' && previous?.role !== 'assistant';
          const isStreamingPlaceholder =
            loading &&
            message.role === 'assistant' &&
            index === messages.length - 1 &&
            !message.content.trim();

          return (
            <div
              key={`${message.role}-${index}`}
              className={`chat-row ${message.role} ${showAssistantHeader ? 'with-header' : 'continued'}`}
            >
              {message.role === 'assistant' && showAssistantHeader ? (
                <div className="message-avatar assistant" aria-hidden="true">
                  <span className="avatar-core" />
                </div>
              ) : message.role === 'assistant' ? (
                <div className="message-avatar-spacer" aria-hidden="true" />
              ) : null}
              <div className={`chat-bubble ${message.role}`}>
                {message.role === 'assistant' && showAssistantHeader ? (
                  <div className="bubble-meta">
                    <span className="bubble-role">Assistant</span>
                    <span className="bubble-model">
                      {isStreamingPlaceholder ? 'thinking' : configs[provider].model}
                    </span>
                  </div>
                ) : null}
                {isStreamingPlaceholder ? (
                  <div className="typing-indicator" aria-label="AI 正在回复">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <div className="bubble-text">{message.content}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="chat-input">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          placeholder={placeholder}
        />
        <button className="send-btn" onClick={() => void handleSend()} disabled={loading || !input.trim()}>
          发送
        </button>
      </div>
      <style>{`
        .chat-panel {
          width: min(420px, 34vw);
          min-width: 340px;
          max-width: 460px;
          height: 100%;
          border-left: 1px solid var(--border);
          background: linear-gradient(180deg, color-mix(in srgb, var(--bg2) 90%, white 10%), var(--bg));
          display: flex;
          flex-direction: column;
          box-shadow: inset 1px 0 0 var(--border);
        }
        .chat-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 18px 14px;
          border-bottom: 1px solid var(--border);
        }
        .chat-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
        }
        .chat-meta {
          margin-top: 6px;
          font-size: 11px;
          font-family: var(--mono);
          color: var(--accent);
        }
        .chat-context {
          margin-top: 5px;
          font-size: 11px;
          color: var(--text3);
          line-height: 1.5;
        }
        .chat-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg3) 90%, white 10%);
          color: var(--text2);
          font-size: 18px;
          cursor: pointer;
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 18px 18px 22px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .chat-row {
          display: flex;
          width: 100%;
          gap: 12px;
          align-items: flex-start;
        }
        .chat-row.user {
          justify-content: flex-end;
        }
        .message-avatar {
          width: 26px;
          height: 26px;
          border-radius: 9px;
          flex: 0 0 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg3) 92%, white 8%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .message-avatar-spacer {
          width: 26px;
          flex: 0 0 26px;
        }
        .avatar-core {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 78%, #163a75 22%));
        }
        .chat-bubble {
          max-width: min(92%, 640px);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .chat-bubble.user {
          padding: 14px 16px;
          border-radius: 18px;
          background: var(--ai-bg);
          border: 1px solid var(--ai-border);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .chat-bubble.assistant {
          padding: 0;
          background: transparent;
          border: 0;
          box-shadow: none;
        }
        .chat-row.assistant.continued {
          margin-top: -8px;
        }
        .bubble-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 18px;
        }
        .bubble-role {
          font-size: 11px;
          font-weight: 600;
          color: var(--text3);
        }
        .bubble-model {
          font-size: 11px;
          font-family: var(--mono);
          color: var(--accent);
          opacity: 0.78;
        }
        .bubble-text {
          font-size: 13px;
          line-height: 1.75;
          color: var(--text);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .chat-bubble.assistant .bubble-text {
          padding: 0 2px 0 0;
        }
        .typing-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 0 2px;
        }
        .typing-indicator span {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--text3);
          animation: chatTyping 1.1s ease-in-out infinite;
        }
        .typing-indicator span:nth-child(2) {
          animation-delay: .14s;
        }
        .typing-indicator span:nth-child(3) {
          animation-delay: .28s;
        }
        .chat-input {
          padding: 14px 16px 16px;
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .chat-input textarea {
          width: 100%;
          min-height: 92px;
          resize: none;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg3) 90%, white 10%);
          color: var(--text);
          padding: 12px;
          line-height: 1.6;
        }
        .send-btn {
          align-self: flex-end;
          min-width: 96px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid var(--ai-border);
          background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 78%, #163a75 22%));
          color: white;
          cursor: pointer;
        }
        .send-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        @keyframes chatTyping {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: .35;
          }
          40% {
            transform: translateY(-3px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function parseProjectSwitchInput(input: string): string | null {
  const trimmed = input.trim();
  const patterns = [
    /^(?:切换到|进入|打开项目|切换项目到)\s*(.+)$/i,
    /^cd\s+(.+)$/i
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return normalizeProjectPath(stripWrappingQuotes(match[1].trim()));
    }
  }

  return null;
}

function buildChangeDirectoryCommand(shell: string, targetPath: string): string {
  const quotedPath = `"${targetPath.replace(/"/g, '\\"')}"`;

  switch (shell) {
    case 'powershell':
      return `Set-Location -LiteralPath ${quotedPath}`;
    case 'cmd':
      return `cd /d ${quotedPath}`;
    case 'wsl':
    case 'git-bash':
    case 'zsh':
    case 'bash':
      return `cd ${quotedPath}`;
    default:
      return `cd ${quotedPath}`;
  }
}

function stripWrappingQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function normalizeProjectPath(value: string): string {
  return value
    .replace(/[。！!，,\s]+$/g, '')
    .replace(/(?:目录|文件夹|项目目录|这个目录|该目录)$/i, '')
    .trim();
}

function detectPlatform(): AppPlatform {
  const value = typeof navigator === 'undefined' ? '' : navigator.userAgent.toLowerCase();

  if (value.includes('mac')) {
    return 'macos';
  }

  if (value.includes('win')) {
    return 'windows';
  }

  return 'linux';
}

function platformLabel(platform: AppPlatform): string {
  switch (platform) {
    case 'macos':
      return 'macOS';
    case 'linux':
      return 'Linux';
    default:
      return 'Windows';
  }
}
