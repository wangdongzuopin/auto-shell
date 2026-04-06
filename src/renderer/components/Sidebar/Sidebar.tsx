import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Settings } from 'lucide-react';
import { SidebarMenu } from './SidebarMenu';
import { RecentThreads } from './RecentThreads';
import { UserProfile } from './UserProfile';
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
      <div className="sidebar-header">
        <div className="sidebar-logo">
          {!collapsed && <span className="logo-text">AI Client</span>}
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="sidebar-actions">
            <button className="sidebar-action-btn" onClick={handleNewChat} title="新建对话">
              <Plus size={18} />
              <span>新建对话</span>
            </button>

            <button className="sidebar-action-btn" title="搜索">
              <Search size={18} />
              <span>搜索</span>
            </button>

            <button className="sidebar-action-btn" onClick={() => navigate('/settings')} title="设置">
              <Settings size={18} />
              <span>设置</span>
            </button>
          </div>

          <SidebarMenu />
          <RecentThreads />
          <UserProfile />
        </>
      )}
    </aside>
  );
};