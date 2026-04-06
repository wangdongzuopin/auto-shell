import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Operation } from '@element-plus/icons-vue';
import './Header.css';

interface HeaderProps {
  title?: string;
  showNav?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showNav = true }) => {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      {showNav && (
        <div className="header-nav">
          <button className="nav-btn" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </button>
          <button className="nav-btn" onClick={() => navigate(1)}>
            <ArrowRight />
          </button>
        </div>
      )}

      {title && <h1 className="header-title">{title}</h1>}

      <div className="header-actions">
        <button className="action-btn">
          <Operation />
        </button>
      </div>
    </header>
  );
};
