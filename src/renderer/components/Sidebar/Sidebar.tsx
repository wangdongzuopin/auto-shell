import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings } from 'lucide-react';
import { SidebarMenu } from './SidebarMenu';
import { RecentThreads } from './RecentThreads';
import { useChatStore } from '../../stores/chatStore';
import './Sidebar.css';

interface SidebarProps {
  collapsed: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const createThread = useChatStore((state) => state.createThread);

  const handleNewChat = () => {
    const thread = createThread();
    navigate(`/chat/${thread.id}`);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-actions">
        <button
          className="sidebar-action-btn"
          onClick={handleNewChat}
          title={collapsed ? '新建对话' : undefined}
        >
          <Plus size={18} />
          {!collapsed && <span>新建对话</span>}
        </button>

        <button
          className="sidebar-action-btn"
          onClick={() => navigate('/settings')}
          title={collapsed ? '设置' : undefined}
        >
          <Settings size={18} />
          {!collapsed && <span>设置</span>}
        </button>
      </div>

      {!collapsed && (
        <>
          <SidebarMenu />
          <RecentThreads />
        </>
      )}
    </aside>
  );
};