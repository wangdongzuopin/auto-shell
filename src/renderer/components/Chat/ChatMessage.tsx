import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../../../shared/types';
import './ChatMessage.css';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isLoading = !message.content && !isUser;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-avatar">
        {isUser ? (
          <span className="avatar user-avatar">J</span>
        ) : (
          <span className="avatar ai-avatar">AI</span>
        )}
      </div>
      <div className="message-content">
        <div className="message-bubble">
          {isLoading ? (
            <div className="thinking-indicator">
              <span className="thinking-dot"></span>
              <span className="thinking-dot"></span>
              <span className="thinking-dot"></span>
              <span className="thinking-text">思考中...</span>
            </div>
          ) : isUser ? (
            message.content
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          )}
          {message.artifacts?.map((artifact) => (
            <div key={artifact.id} className="artifact-card">
              <div className="artifact-header">
                <span className="artifact-title">{artifact.title}</span>
                <span className="artifact-type">{artifact.type}</span>
              </div>
              <pre className="artifact-content">
                <code>{artifact.content}</code>
              </pre>
              <button className="artifact-copy">复制</button>
            </div>
          ))}
        </div>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
};
