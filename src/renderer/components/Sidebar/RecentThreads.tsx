import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { confirm } from '../ConfirmDialog';
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
  const deleteThread = useChatStore((state) => state.deleteThread);
  const updateThread = useChatStore((state) => state.updateThread);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const handleThreadClick = (threadId: string) => {
    setCurrentThread(threadId);
    navigate(`/chat/${threadId}`);
  };

  const handleDelete = async (threadId: string) => {
    const ok = await confirm('确定要删除这个对话吗？', '确认删除');
    if (ok) {
      deleteThread(threadId);
    }
    setOpenMenuId(null);
  };

  const handleRename = (thread: { id: string; title: string }) => {
    setEditingId(thread.id);
    setEditTitle(thread.title);
    setOpenMenuId(null);
  };

  const handleSaveRename = (threadId: string) => {
    if (editTitle.trim()) {
      updateThread(threadId, { title: editTitle.trim() });
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, threadId: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(threadId);
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const recentThreads = threads.slice(0, 10);

  return (
    <div className="recent-threads" ref={menuRef}>
      <div className="recent-header">最近对话</div>
      <div className="recent-list">
        {recentThreads.map((thread) => (
          <div
            key={thread.id}
            className="recent-item-wrapper"
            onMouseEnter={() => {}}
            onMouseLeave={() => {}}
          >
            {editingId === thread.id ? (
              <input
                type="text"
                className="recent-edit-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleSaveRename(thread.id)}
                onKeyDown={(e) => handleKeyDown(e, thread.id)}
                autoFocus
              />
            ) : (
              <button
                className="recent-item"
                onClick={() => handleThreadClick(thread.id)}
              >
                <span className="recent-title">{thread.title}</span>
                <span className="recent-time">{formatTime(thread.updatedAt)}</span>
              </button>
            )}
            <button
              className="recent-more-btn"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === thread.id ? null : thread.id);
              }}
            >
              <MoreVertical size={14} />
            </button>
            {openMenuId === thread.id && (
              <div className="recent-menu">
                <button
                  className="recent-menu-item"
                  onClick={() => handleRename(thread)}
                >
                  <Pencil size={14} />
                  <span>重命名</span>
                </button>
                <button
                  className="recent-menu-item danger"
                  onClick={() => handleDelete(thread.id)}
                >
                  <Trash2 size={14} />
                  <span>删除</span>
                </button>
              </div>
            )}
          </div>
        ))}
        {recentThreads.length === 0 && (
          <div className="recent-empty">暂无对话记录</div>
        )}
      </div>
    </div>
  );
};
