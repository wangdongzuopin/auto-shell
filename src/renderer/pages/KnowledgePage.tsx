import React from 'react';
import { Header } from '../components/common/Header';
import './KnowledgePage.css';

export const KnowledgePage: React.FC = () => {
  return (
    <div className="knowledge-page">
      <Header title="知识库" showNav={false} />
      <div className="page-content">
        <div className="knowledge-empty">
          <p>上传文档构建知识库</p>
          <button className="upload-btn">上传文档</button>
        </div>
      </div>
    </div>
  );
};
