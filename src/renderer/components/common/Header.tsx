import React from 'react';
import { Menu, ArrowLeft, ArrowRight, Minus, Square, X, Ghost } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ sidebarCollapsed, onToggleSidebar }) => {
  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow?.();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow?.();
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="header-btn" onClick={onToggleSidebar} title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}>
          <Menu size={18} />
        </button>
        <button className="header-btn">
          <ArrowLeft size={18} />
        </button>
        <button className="header-btn">
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="header-center">
        <span className="plan-badge">Free plan</span>
      </div>

      <div className="header-right">
        <button className="header-btn ghost">
          <Ghost size={18} />
        </button>
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