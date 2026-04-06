import React from 'react';
import { Header } from '../components/common/Header';
import './ArtifactsPage.css';

export const ArtifactsPage: React.FC = () => {
  return (
    <div className="artifacts-page">
      <Header title="生成物" showNav={false} />
      <div className="page-content">
        <div className="artifacts-empty">
          <p>AI 生成的内容会保存在这里</p>
        </div>
      </div>
    </div>
  );
};
