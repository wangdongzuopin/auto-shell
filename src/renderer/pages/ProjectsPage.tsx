import React from 'react';

export const ProjectsPage: React.FC = () => {
  return (
    <div className="projects-page">
      <div className="page-content">
        <div className="projects-empty">
          <p>创建项目组织你的工作</p>
          <button className="create-btn">新建项目</button>
        </div>
      </div>
    </div>
  );
};
