import React from 'react';
import { Header } from '../components/common/Header';

export const SkillsPage: React.FC = () => {
  return (
    <div className="skills-page">
      <Header title="技能市场" showNav={false} />
      <div className="page-content">
        <div className="skills-grid">
          <div className="skill-card">
            <div className="skill-icon">🛠️</div>
            <h3>代码助手</h3>
            <p>帮你写代码、调试、审查代码</p>
          </div>
          <div className="skill-card">
            <div className="skill-icon">📝</div>
            <h3>写作助手</h3>
            <p>帮你写作、翻译、润色文章</p>
          </div>
          <div className="skill-card">
            <div className="skill-icon">🔍</div>
            <h3>搜索助手</h3>
            <p>帮你搜索信息、分析数据</p>
          </div>
        </div>
      </div>
    </div>
  );
};
