import { useState, useEffect } from 'react';
import { getAllModelPresets, MODEL_PRESETS } from '../../../ai/models';
import { useSettingsStore } from '../../store/settings';
import type { ProviderType } from '../../store/settings';

/**
 * AI Settings - 基于模型预设的配置界面
 * 用户只需选择模型 + 输入 API Key
 */
export function AISettings() {
  const { aiSettings, setProvider, setProviderConfig } = useSettingsStore();
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const currentModel = aiSettings.configs[aiSettings.provider]?.model || 'MiniMax-M2.7';
  const currentPreset = MODEL_PRESETS[currentModel];
  const models = getAllModelPresets();

  // 加载 API Key
  useEffect(() => {
    window.api.getKey(aiSettings.provider).then((key) => {
      setApiKey(key || '');
    });
  }, [aiSettings.provider]);

  const handleModelChange = async (modelId: string) => {
    // 找到这个 modelId 对应的 preset
    const preset = MODEL_PRESETS[modelId];
    if (!preset) return;

    // 根据 brand 确定 provider type
    const brandToProvider: Record<string, ProviderType> = {
      'Anthropic': 'claude',
      'OpenAI': 'openai',
      'MiniMax': 'minimax',
      'Zhipu': 'glm',
      'Ollama': 'ollama',
    };

    const providerType = brandToProvider[preset.brand] || aiSettings.provider;

    // 更新 provider
    await setProvider(providerType);

    // 更新 provider config (baseUrl, model)
    await setProviderConfig(providerType, {
      baseUrl: preset.baseUrl,
      model: preset.id,
    });

    // 重新加载新 provider 的 key
    const key = await window.api.getKey(providerType);
    setApiKey(key || '');
  };

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
  };

  const handleSaveApiKey = async () => {
    if (apiKey) {
      await window.api.saveKey(aiSettings.provider, apiKey);
    }
  };

  const handleTestConnection = async () => {
    setIsChecking(true);
    setIsConnected(null);
    try {
      // 先保存 API Key
      if (apiKey) {
        await window.api.saveKey(aiSettings.provider, apiKey);
      }
      const available = await window.api.checkAIAvailable();
      setIsConnected(available);
    } catch {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleReset = (field: 'baseUrl' | 'temperature' | 'maxTokens') => {
    // 重置到默认值
    if (field === 'baseUrl' && currentPreset) {
      setProviderConfig(aiSettings.provider, {
        ...aiSettings.configs[aiSettings.provider],
        baseUrl: currentPreset.baseUrl,
      });
    }
  };

  return (
    <div className="ai-settings">
      {/* 模型选择 */}
      <div className="settings-section">
        <div className="section-title">选择模型</div>
        <div className="model-selector">
          <select
            value={currentModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className="model-select"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.brand})
              </option>
            ))}
          </select>
        </div>
        <div className="model-hint">
          {currentPreset ? `${currentPreset.baseUrl}` : '选择模型自动配置端点'}
        </div>
      </div>

      {/* API Key */}
      <div className="settings-section">
        <div className="section-title">API Key</div>
        <div className="api-key-row">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="sk-..."
            className="api-key-input"
          />
          <button onClick={handleSaveApiKey} className="save-btn">
            保存
          </button>
        </div>
      </div>

      {/* 连接状态 */}
      <div className="settings-section">
        <div className="connection-row">
          <button
            onClick={handleTestConnection}
            disabled={isChecking}
            className="test-btn"
          >
            {isChecking ? '检测中...' : '测试连接'}
          </button>
          {isConnected === true && (
            <span className="status-ok">✓ 已连接</span>
          )}
          {isConnected === false && (
            <span className="status-fail">✗ 连接失败</span>
          )}
        </div>
      </div>

      {/* 高级选项 */}
      <div className="settings-section">
        <button
          className="advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▲' : '▼'} 高级选项
        </button>

        {showAdvanced && (
          <div className="advanced-panel">
            <div className="advanced-row">
              <label>端点</label>
              <input
                type="text"
                value={aiSettings.configs[aiSettings.provider]?.baseUrl || ''}
                className="advanced-input"
                placeholder={currentPreset?.baseUrl}
              />
              <button onClick={() => handleReset('baseUrl')} className="reset-btn">
                重置
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .ai-settings {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .settings-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .section-title {
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--text3);
          font-weight: 700;
        }
        .model-select {
          width: 100%;
          padding: 10px 12px;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-size: 14px;
          cursor: pointer;
        }
        .model-select:hover {
          border-border-color: var(--ai-border);
        }
        .model-hint {
          font-size: 11px;
          color: var(--text3);
          font-family: var(--mono);
        }
        .api-key-row {
          display: flex;
          gap: 8px;
        }
        .api-key-input {
          flex: 1;
          padding: 10px 12px;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-size: 14px;
        }
        .save-btn, .test-btn {
          padding: 10px 14px;
          background: var(--ai-bg);
          border: 1px solid var(--ai-border);
          border-radius: 8px;
          color: var(--text);
          font-size: 12px;
          cursor: pointer;
        }
        .save-btn:hover, .test-btn:hover {
          background: var(--bg3);
        }
        .test-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .connection-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .status-ok {
          color: var(--green);
          font-size: 13px;
        }
        .status-fail {
          color: var(--yellow);
          font-size: 13px;
        }
        .advanced-toggle {
          background: transparent;
          border: none;
          color: var(--text3);
          font-size: 12px;
          cursor: pointer;
          padding: 4px 0;
          text-align: left;
        }
        .advanced-panel {
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
        }
        .advanced-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .advanced-row label {
          font-size: 12px;
          color: var(--text2);
          min-width: 50px;
        }
        .advanced-input {
          flex: 1;
          padding: 6px 10px;
          background: var(--bg4);
          border: 1px solid var(--border2);
          border-radius: 4px;
          color: var(--text);
          font-size: 12px;
          font-family: var(--mono);
        }
        .reset-btn {
          padding: 4px 8px;
          background: var(--bg4);
          border: 1px solid var(--border2);
          border-radius: 4px;
          color: var(--text2);
          font-size: 11px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
