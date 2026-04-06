import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, Setting } from '@element-plus/icons-vue';
import { ElTooltip } from 'element-plus';
import { SidebarMenu } from './SidebarMenu';
import { RecentThreads } from './RecentThreads';
import { UserProfile } from './UserProfile';
import { useChatStore } from '../../stores/chatStore';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const createThread = useChatStore((state) => state.createThread);

  const handleNewChat = () => {
    const thread = createThread();
    navigate(`/chat/${thread.id}`);
  };

  const handleSearch = () => {
    console.log('Search clicked');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-text">AI Client</span>
        </div>
      </div>

      <div className="sidebar-actions">
        <ElTooltip content="新建对话" placement="right">
          <button className="sidebar-action-btn" onClick={handleNewChat}>
            <Plus />
            <span>新建对话</span>
          </button>
        </ElTooltip>

        <ElTooltip content="搜索" placement="right">
          <button className="sidebar-action-btn" onClick={handleSearch}>
            <Search />
            <span>搜索</span>
          </button>
        </ElTooltip>

        <ElTooltip content="设置" placement="right">
          <button
            className={`sidebar-action-btn ${isActive('/settings') ? 'active' : ''}`}
            onClick={handleSettings}
          >
            <Setting />
            <span>设置</span>
          </button>
        </ElTooltip>
      </div>

      <SidebarMenu />
      <RecentThreads />
      <UserProfile />
    </aside>
  );
};
