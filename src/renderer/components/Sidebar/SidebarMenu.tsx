import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, FileText, Wrench, Folder, Sparkles, LucideIcon } from 'lucide-react';
import './SidebarMenu.css';

interface MenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

const menuItems: MenuItem[] = [
  { key: 'chat', label: '对话', icon: MessageSquare, path: '/' },
  { key: 'knowledge', label: '知识库', icon: FileText, path: '/knowledge' },
  { key: 'skills', label: '技能', icon: Wrench, path: '/skills' },
  { key: 'projects', label: '项目', icon: Folder, path: '/projects' },
  { key: 'artifacts', label: '生成物', icon: Sparkles, path: '/artifacts' },
];

export const SidebarMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/chat/');
    }
    return location.pathname.startsWith(path);
  };

  const handleClick = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="sidebar-menu">
      {menuItems.map((item) => (
        <button
          key={item.key}
          className={`sidebar-menu-item ${isActive(item.path) ? 'active' : ''}`}
          onClick={() => handleClick(item.path)}
        >
          <item.icon size={18} className="menu-icon" />
          <span className="menu-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
