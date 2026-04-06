import React from 'react';
import { Header } from '../components/common/Header';

export const ProjectsPage: React.FC = () => {
  return (
    <div className="projects-page">
      <Header title="项目" showNav={false} />
      <div className="page-content">
        <div className="projects-empty">
          <p>创建项目组织你的工作</p>
          <button className="create-btn">新建项目</button>
        </div>
      </div>
    </div>
  );
};
