import React, { useState } from 'react';
import { Header } from '../components/common/Header';
import { useModelStore, type AIModel } from '../stores/modelStore';
import { Plus, Trash2, Star, Edit2, X, Check } from 'lucide-react';
import './ModelsPage.css';

export const ModelsPage: React.FC = () => {
  const { models, addModel, updateModel, deleteModel, setDefaultModel } = useModelStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<AIModel>>({
    name: '',
    provider: 'openai',
    modelName: '',
    apiKey: '',
    baseUrl: '',
  });

  const handleAdd = () => {
    if (formData.name && formData.modelName) {
      addModel({
        name: formData.name,
        provider: formData.provider || 'openai',
        modelName: formData.modelName,
        apiKey: formData.apiKey,
        baseUrl: formData.baseUrl,
        isDefault: false,
      });
      setIsAdding(false);
      setFormData({
        name: '',
        provider: 'openai',
        modelName: '',
        apiKey: '',
        baseUrl: '',
      });
    }
  };

  const handleDelete = (id: string) => {
    if (models.length > 1) {
      deleteModel(id);
    }
  };

  const handleSetDefault = (id: string) => {
    setDefaultModel(id);
  };

  const providerLabels: Record<AIModel['provider'], string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    minimax: 'MiniMax',
    glm: 'GLM',
    ollama: 'Ollama',
    custom: '自定义',
  };

  return (
    <div className="models-page">
      <Header title="模型设置" showNav={false} />
      <div className="page-content">
        <div className="models-header">
          <h2>AI 模型</h2>
          <button className="add-btn" onClick={() => setIsAdding(true)}>
            <Plus size={16} />
            添加模型
          </button>
        </div>

        {isAdding && (
          <div className="model-form">
            <div className="form-row">
              <label>
                <span>名称</span>
                <input
                  type="text"
                  placeholder="例如：我的 GPT-4"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </label>
              <label>
                <span>提供商</span>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value as AIModel['provider'] })}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="minimax">MiniMax</option>
                  <option value="glm">GLM</option>
                  <option value="ollama">Ollama</option>
                  <option value="custom">自定义</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                <span>模型名称</span>
                <input
                  type="text"
                  placeholder="例如：gpt-4, claude-3-opus"
                  value={formData.modelName}
                  onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                />
              </label>
            </div>
            {(formData.provider === 'custom' || formData.provider === 'ollama') && (
              <div className="form-row">
                <label>
                  <span>API 地址</span>
                  <input
                    type="text"
                    placeholder="例如：http://localhost:11434"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  />
                </label>
              </div>
            )}
            {formData.provider !== 'anthropic' && formData.provider !== 'ollama' && (
              <div className="form-row">
                <label>
                  <span>API Key</span>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  />
                </label>
              </div>
            )}
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setIsAdding(false)}>
                <X size={16} />
                取消
              </button>
              <button className="confirm-btn" onClick={handleAdd}>
                <Check size={16} />
                添加
              </button>
            </div>
          </div>
        )}

        <div className="models-list">
          {models.map((model) => (
            <div key={model.id} className={`model-card ${model.isDefault ? 'default' : ''}`}>
              <div className="model-info">
                <div className="model-name">
                  {model.name}
                  {model.isDefault && <span className="default-badge">默认</span>}
                </div>
                <div className="model-meta">
                  <span className="provider">{providerLabels[model.provider]}</span>
                  <span className="model-name-text">{model.modelName}</span>
                </div>
              </div>
              <div className="model-actions">
                {!model.isDefault && (
                  <button
                    className="action-btn"
                    onClick={() => handleSetDefault(model.id)}
                    title="设为默认"
                  >
                    <Star size={16} />
                  </button>
                )}
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(model.id)}
                  disabled={models.length <= 1}
                  title="删除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
