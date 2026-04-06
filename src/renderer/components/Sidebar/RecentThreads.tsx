import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../stores/chatStore';
import './RecentThreads.css';

const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
};

export const RecentThreads: React.FC = () => {
  const navigate = useNavigate();
  const threads = useChatStore((state) => state.threads);
  const setCurrentThread = useChatStore((state) => state.setCurrentThread);

  const handleThreadClick = (threadId: string) => {
    setCurrentThread(threadId);
    navigate(`/chat/${threadId}`);
  };

  const recentThreads = threads.slice(0, 5);

  return (
    <div className="recent-threads">
      <div className="recent-header">最近对话</div>
      <div className="recent-list">
        {recentThreads.map((thread) => (
          <button
            key={thread.id}
            className="recent-item"
            onClick={() => handleThreadClick(thread.id)}
          >
            <span className="recent-title">{thread.title}</span>
            <span className="recent-time">{formatTime(thread.updatedAt)}</span>
          </button>
        ))}
        {recentThreads.length === 0 && (
          <div className="recent-empty">暂无对话记录</div>
        )}
      </div>
    </div>
  );
};
