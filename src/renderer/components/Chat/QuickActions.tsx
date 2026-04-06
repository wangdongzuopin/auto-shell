import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../stores/chatStore';
import './QuickActions.css';

interface QuickAction {
  icon: string;
  label: string;
  prompt: string;
}

const quickActions: QuickAction[] = [
  { icon: '💻', label: '代码', prompt: '帮我写代码' },
  { icon: '📝', label: '写作', prompt: '帮我写作' },
  { icon: '✨', label: '创建', prompt: '帮我创建一个项目' },
  { icon: '📖', label: '学习', prompt: '我想学习' },
  { icon: '🌿', label: '生活', prompt: '帮我解决生活问题' },
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
