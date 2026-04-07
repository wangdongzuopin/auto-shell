import React from 'react';
import { Menu, Minus, Square, X } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ sidebarCollapsed, onToggleSidebar }) => {
  const handleMinimize = () => {
    window.api?.minimizeWindow?.();
  };

  const handleMaximize = () => {
    window.api?.maximizeWindow?.();
  };

  const handleClose = () => {
    window.api?.closeWindow?.();
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="header-btn" onClick={onToggleSidebar} title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}>
          <Menu size={18} />
        </button>
      </div>

      <div className="header-center">
        <span className="plan-badge">AI Client</span>
      </div>

      <div className="header-right">
        <button className="header-btn" onClick={handleMinimize}>
          <Minus size={18} />
        </button>
        <button className="header-btn" onClick={handleMaximize}>
          <Square size={16} />
        </button>
        <button className="header-btn close" onClick={handleClose}>
          <X size={18} />
        </button>
      </div>
    </header>
  );
};