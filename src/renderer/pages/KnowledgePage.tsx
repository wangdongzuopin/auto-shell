import React from 'react';

export const KnowledgePage: React.FC = () => {
  return (
    <div className="knowledge-page">
      <div className="page-content">
        <div className="knowledge-empty">
          <p>上传文档构建知识库</p>
          <button className="upload-btn">上传文档</button>
        </div>
      </div>
    </div>
  );
};
