import { useState } from 'react';
import { getAllModelPresets, MODEL_PRESETS } from '../../../ai/models';

interface AIModelSelectorProps {
  currentModel: string;
  apiKey: string;
  modelConfig: {
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
  };
  onModelChange: (modelId: string) => void;
  onApiKeyChange: (apiKey: string) => void;
  onConfigChange: (config: AIModelSelectorProps['modelConfig']) => void;
}

export function AIModelSelector({
  currentModel,
  apiKey,
  modelConfig,
  onModelChange,
  onApiKeyChange,
  onConfigChange,
}: AIModelSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const models = getAllModelPresets();

  const currentPreset = MODEL_PRESETS[currentModel];

  const handleTestConnection = async () => {
    setIsConnected(null);
    try {
      const available = await window.api.checkAIAvailable();
      setIsConnected(available);
    } catch {
      setIsConnected(false);
    }
  };

  const handleReset = (field: 'baseUrl' | 'temperature' | 'maxTokens') => {
    if (currentPreset) {
      if (field === 'baseUrl') {
        onConfigChange({ ...modelConfig, baseUrl: undefined });
      } else if (field === 'temperature') {
        onConfigChange({ ...modelConfig, temperature: currentPreset.defaultTemperature });
      } else if (field === 'maxTokens') {
        onConfigChange({ ...modelConfig, maxTokens: currentPreset.defaultMaxTokens });
      }
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ marginBottom: '16px' }}>AI 模型</h3>

      {/* 模型选择 */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', color: '#9ca3af' }}>
          模型
        </label>
        <select
          value={currentModel}
          onChange={(e) => onModelChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '6px',
            color: '#fff',
          }}
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.brand})
            </option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', color: '#9ca3af' }}>
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="sk-..."
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '6px',
            color: '#fff',
          }}
        />
      </div>

      {/* 连接状态 */}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={handleTestConnection}
          style={{
            padding: '6px 12px',
            background: '#3b82f6',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          测试连接
        </button>
        {isConnected === true && (
          <span style={{ color: '#22c55e' }}>✓ 已连接</span>
        )}
        {isConnected === false && (
          <span style={{ color: '#ef4444' }}>✗ 连接失败</span>
        )}
      </div>

      {/* 高级选项 */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          {showAdvanced ? '▲' : '▼'} 高级选项
        </button>

        {showAdvanced && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#1f2937', borderRadius: '6px' }}>
            {/* 自定义端点 */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#9ca3af' }}>
                端点
              </label>
              <input
                type="text"
                value={modelConfig.baseUrl || currentPreset?.baseUrl || ''}
                onChange={(e) => onConfigChange({ ...modelConfig, baseUrl: e.target.value })}
                placeholder={currentPreset?.baseUrl}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              />
            </div>

            {/* Temperature */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#9ca3af' }}>
                Temperature
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={modelConfig.temperature ?? currentPreset?.defaultTemperature ?? 0.7}
                  onChange={(e) => onConfigChange({ ...modelConfig, temperature: parseFloat(e.target.value) })}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '4px',
                    color: '#fff',
                  }}
                />
                <button
                  onClick={() => handleReset('temperature')}
                  style={{
                    padding: '6px 12px',
                    background: '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#9ca3af',
                    cursor: 'pointer',
                  }}
                >
                  重置
                </button>
              </div>
            </div>

            {/* Max Tokens */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', color: '#9ca3af' }}>
                Max Tokens
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={modelConfig.maxTokens ?? currentPreset?.defaultMaxTokens ?? 4096}
                  onChange={(e) => onConfigChange({ ...modelConfig, maxTokens: parseInt(e.target.value) })}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '4px',
                    color: '#fff',
                  }}
                />
                <button
                  onClick={() => handleReset('maxTokens')}
                  style={{
                    padding: '6px 12px',
                    background: '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#9ca3af',
                    cursor: 'pointer',
                  }}
                >
                  重置
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
