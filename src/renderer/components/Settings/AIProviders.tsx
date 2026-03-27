import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settings';
import { FeatureToggles } from './FeatureToggles';

const PROVIDERS = [
  { id: 'minimax', name: 'MiniMax (推荐)', desc: '云端', color: '#FF6B6B' },
  { id: 'claude', name: 'Claude (Anthropic)', desc: '云端', color: '#FF6B6B' },
  { id: 'openai', name: 'OpenAI', desc: '云端', color: '#FF6B6B' },
  { id: 'ollama', name: 'Ollama (本地)', desc: '离线', color: '#4ade80' }
] as const;

export function AIProviders() {
  const { aiSettings, setProvider, setAISettings } = useSettingsStore();
  const [apiKey, setApiKey] = useState(aiSettings.apiKey);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Load API key from secure storage
    window.api.getKey(aiSettings.provider).then(key => {
      if (key) setApiKey(key);
    });
  }, [aiSettings.provider]);

  // Check provider availability
  useEffect(() => {
    if (aiSettings.provider === 'ollama') {
      // Ollama doesn't need API key check
      setAvailable(prev => ({ ...prev, ollama: true }));
      return;
    }

    if (!apiKey) {
      setAvailable(prev => ({ ...prev, [aiSettings.provider]: false }));
      return;
    }

    const checkAvailability = async () => {
      setChecking(true);
      try {
        const isAvailable = await window.api.checkAIAvailable();
        setAvailable(prev => ({ ...prev, [aiSettings.provider]: isAvailable }));
      } catch {
        setAvailable(prev => ({ ...prev, [aiSettings.provider]: false }));
      } finally {
        setChecking(false);
      }
    };

    checkAvailability();
  }, [aiSettings.provider, apiKey]);

  const handleProviderChange = (id: typeof PROVIDERS[number]['id']) => {
    setProvider(id);
    // Update baseUrl and model based on provider
    const configs: Record<string, { baseUrl: string; model: string }> = {
      minimax: { baseUrl: 'https://api.minimaxi.com/v1', model: 'MiniMax-M2.7' },
      claude: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514' },
      openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
      ollama: { baseUrl: 'http://localhost:11434', model: 'llama3' }
    };
    setAISettings(configs[id]);
    setApiKey('');
  };

  const handleSaveKey = async () => {
    setSaving(true);
    try {
      await window.api.saveKey(aiSettings.provider, apiKey);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ai-providers">
      <div className="settings-section">
        <div className="section-title">AI 提供商</div>
        <div className="provider-grid">
          {PROVIDERS.map(p => (
            <div
              key={p.id}
              className={`provider-item ${aiSettings.provider === p.id ? 'active' : ''}`}
              onClick={() => handleProviderChange(p.id)}
            >
              <div className="provider-dot" style={{ background: aiSettings.provider === p.id ? 'var(--accent)' : 'var(--border2)' }} />
              <span className="provider-name">{p.name}</span>
              <span className="provider-desc">{p.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="section-title">API Key</div>
        <div className="api-key-row">
          <input
            type="password"
            className="api-key-input"
            placeholder={aiSettings.provider === 'ollama' ? '无需 API Key（本地模型）' : 'sk-...'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={aiSettings.provider === 'ollama'}
          />
          <button
            className="api-key-save"
            onClick={handleSaveKey}
            disabled={saving || aiSettings.provider === 'ollama'}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
        <div className="api-key-hint">Key 使用系统密钥链加密存储，不会上传</div>
      </div>

      <div className="settings-section">
        <div className="section-title">功能开关</div>
        <FeatureToggles />
      </div>

      <div className="settings-section">
        <div className="section-title">连接状态</div>
        <div className="status-pills">
          {PROVIDERS.map(p => (
            <span
              key={p.id}
              className={`status-pill ${available[p.id] ? 'ok' : 'off'}`}
            >
              <span className="status-dot" />
              {p.name} {available[p.id] ? '正常' : '未连接'}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .ai-providers { }
        .settings-section { margin-bottom: 22px; }
        .section-title {
          font-size: 10px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--text3);
          font-weight: 500;
          margin-bottom: 10px;
        }
        .provider-grid { display: flex; flex-direction: column; gap: 6px; }
        .provider-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 6px;
          background: var(--bg3);
          border: 1px solid var(--border);
          cursor: pointer;
          transition: border-color .12s;
        }
        .provider-item:hover { border-color: var(--border2); }
        .provider-item.active { border-color: var(--accent); }
        .provider-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .provider-name { font-size: 12px; color: var(--text); font-weight: 500; flex: 1; }
        .provider-desc { font-size: 11px; color: var(--text3); margin-left: auto; }
        .api-key-row { display: flex; gap: 6px; margin-bottom: 8px; }
        .api-key-input {
          flex: 1;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-family: var(--mono);
          font-size: 11px;
          padding: 6px 10px;
          outline: none;
        }
        .api-key-input:focus { border-color: var(--border2); }
        .api-key-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .api-key-save {
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 11px;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity .12s;
        }
        .api-key-save:hover { opacity: .85; }
        .api-key-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .api-key-hint { font-size: 11px; color: var(--text3); }
        .status-pills { display: flex; gap: 8px; flex-wrap: wrap; }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 99px;
          font-size: 11px;
        }
        .status-pill.ok {
          background: rgba(74,222,128,.12);
          color: var(--green);
          border: 1px solid rgba(74,222,128,.25);
        }
        .status-pill.off {
          background: var(--bg4);
          color: var(--text3);
          border: 1px solid var(--border);
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .status-pill.ok .status-dot { background: var(--green); }
        .status-pill.off .status-dot { background: var(--text3); }
      `}</style>
    </div>
  );
}
