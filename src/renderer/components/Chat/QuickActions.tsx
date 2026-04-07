import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../stores/chatStore';
import './QuickActions.css';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  prompt: string;
}

const CodeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const WriteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const CreateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18" />
    <path d="M5.5 8.5L12 3l6.5 5.5" />
    <path d="M5.5 15.5L12 21l6.5-5.5" />
  </svg>
);

const LearnIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const LifeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
    <line x1="6" x2="6" y1="2" y2="4" />
    <line x1="10" x2="10" y1="2" y2="4" />
    <line x1="14" x2="14" y1="2" y2="4" />
  </svg>
);

const quickActions: QuickAction[] = [
  { icon: <CodeIcon />, label: 'Code', prompt: '帮我写代码' },
  { icon: <WriteIcon />, label: 'Write', prompt: '帮我写作' },
  { icon: <CreateIcon />, label: 'Create', prompt: '帮我创建一个项目' },
  { icon: <LearnIcon />, label: 'Learn', prompt: '我想学习' },
  { icon: <LifeIcon />, label: 'Life stuff', prompt: '帮我解决生活问题' },
];

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const createThread = useChatStore((state) => state.createThread);
  const addMessage = useChatStore((state) => state.addMessage);

  const handleAction = (action: QuickAction) => {
    const thread = createThread(action.label);
    addMessage(thread.id, {
      id: Math.random().toString(36).substring(2),
      role: 'user',
      content: action.prompt,
      timestamp: Date.now(),
    });
    navigate(`/chat/${thread.id}`);
  };

  return (
    <div className="quick-actions">
      {quickActions.map((action) => (
        <button
          key={action.label}
          className="quick-action-btn"
          onClick={() => handleAction(action)}
        >
          <span className="action-icon">{action.icon}</span>
          <span className="action-label">{action.label}</span>
        </button>
      ))}
    </div>
  );
};
