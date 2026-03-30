import React, { useEffect, useMemo, useState } from 'react';
import type { ProviderType } from '../../store/settings';
import { useSettingsStore } from '../../store/settings';
import { toast } from '../Toast';

interface ModelConfigDialogProps {
  open: boolean;
  onClose: () => void;
}

const PROVIDERS: Array<{
  id: ProviderType;
  name: string;
  helper: string;
  apiKeyRequired: boolean;
}> = [
  { id: 'minimax', name: 'MiniMax', helper: 'Anthropic 兼容接入', apiKeyRequired: true },
  { id: 'glm', name: 'GLM', helper: '智谱开放平台', apiKeyRequired: true },
  { id: 'claude', name: 'Claude', helper: 'Anthropic 官方接口', apiKeyRequired: true },
  { id: 'openai', name: 'OpenAI', helper: 'OpenAI 官方接口', apiKeyRequired: true },
  { id: 'ollama', name: 'Ollama', helper: '本地模型服务', apiKeyRequired: false },
  { id: 'openaiCompatible', name: '兼容接口', helper: '任意 OpenAI 兼容网关', apiKeyRequired: true }
];

export function ModelConfigDialog({ open, onClose }: ModelConfigDialogProps) {
  const { aiSettings, setProvider, setProviderConfig } = useSettingsStore();
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>(aiSettings.provider);
  const [apiKey, setApiKey] = useState('');
  const [checking, setChecking] = useState(false);

  const config = aiSettings.configs[selectedProvider];
  const providerMeta = useMemo(
    () => PROVIDERS.find((provider) => provider.id === selectedProvider),
    [selectedProvider]
  );

  useEffect(() => {
    if (!open) return;
    setSelectedProvider(aiSettings.provider);
  }, [open, aiSettings.provider]);

  useEffect(() => {
    if (!open) return;
    window.api.getKey(selectedProvider).then((key) => setApiKey(key ?? ''));
  }, [open, selectedProvider]);

  if (!open) return null;

  const updateConfig = async (patch: Partial<typeof config>) => {
    await setProviderConfig(selectedProvider, {
      ...config,
      ...patch
    });
  };

  const handleApplyProvider = async () => {
    await setProvider(selectedProvider);
    toast(`${providerMeta?.name ?? selectedProvider} 已设为当前对话模型`);
  };

  const handleSaveKey = async () => {
    await window.api.saveKey(selectedProvider, apiKey.trim());
    toast(`${providerMeta?.name ?? selectedProvider} 的 API Key 已保存`);
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      await setProvider(selectedProvider);
      const ok = await window.api.checkAIAvailable();
      toast(ok ? '连接成功，配置已生效' : '连接失败，请检查配置');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="model-dialog-mask" onClick={onClose}>
      <div className="model-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="model-dialog-header">
          <div>
            <div className="model-dialog-title">模型配置</div>
            <div className="model-dialog-subtitle">配置 Provider、Base URL、模型名和 API Key，保存后立即生效。</div>
          </div>
          <button className="dialog-close" onClick={onClose} aria-label="关闭模型配置">×</button>
        </div>

        <div className="model-dialog-body">
          <div className="provider-list">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                className={`provider-list-item ${selectedProvider === provider.id ? 'active' : ''}`}
                onClick={() => setSelectedProvider(provider.id)}
              >
                <span>{provider.name}</span>
                <small>{provider.helper}</small>
              </button>
            ))}
          </div>

          <div className="provider-config">
            <div className="config-block">
              <label>API Base URL</label>
              <input
                value={config.baseUrl}
                onChange={(event) => void updateConfig({ baseUrl: event.target.value })}
                placeholder="https://api.example.com/v1"
              />
            </div>

            <div className="config-block">
              <label>模型名称</label>
              <input
                value={config.model}
                onChange={(event) => void updateConfig({ model: event.target.value })}
                placeholder="gpt-4o-mini"
              />
            </div>

            <div className="config-block">
              <label>API Key</label>
              <div className="api-key-row">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={providerMeta?.apiKeyRequired ? 'sk-...' : 'Ollama 无需 API Key'}
                  disabled={!providerMeta?.apiKeyRequired}
                />
                <button onClick={() => void handleSaveKey()} disabled={!providerMeta?.apiKeyRequired}>
                  保存 Key
                </button>
              </div>
              <span className="field-hint">API Key 会和模型配置一起写入用户目录下的 ~/.autoshell/config.json。</span>
            </div>

            <div className="dialog-actions">
              <button className="secondary-btn" onClick={() => void handleCheck()} disabled={checking}>
                {checking ? '检测中...' : '测试连接'}
              </button>
              <button className="primary-btn" onClick={() => void handleApplyProvider()}>
                设为当前模型
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .model-dialog-mask {
          position: fixed;
          inset: 0;
          background: rgba(4, 8, 14, 0.44);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 40;
        }
        .model-dialog {
          width: min(920px, calc(100vw - 56px));
          min-height: 560px;
          background: linear-gradient(180deg, color-mix(in srgb, var(--bg2) 88%, white 12%), var(--bg));
          border: 1px solid var(--border2);
          border-radius: 18px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.20);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .model-dialog-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 22px 24px 18px;
          border-bottom: 1px solid var(--border);
        }
        .model-dialog-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
        }
        .model-dialog-subtitle {
          margin-top: 6px;
          font-size: 12px;
          color: var(--text2);
        }
        .dialog-close {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg3) 86%, white 14%);
          color: var(--text2);
          font-size: 20px;
          cursor: pointer;
        }
        .dialog-close:hover {
          color: var(--text);
          background: var(--bg3);
        }
        .model-dialog-body {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          flex: 1;
          min-height: 0;
        }
        .provider-list {
          padding: 18px;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: color-mix(in srgb, var(--bg2) 92%, white 8%);
        }
        .provider-list-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;
          padding: 14px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg3);
          color: var(--text);
          cursor: pointer;
        }
        .provider-list-item small {
          color: var(--text2);
          font-size: 11px;
          line-height: 1.5;
        }
        .provider-list-item.active {
          border-color: var(--ai-border);
          background: var(--ai-bg);
        }
        .provider-config {
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .config-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .config-block label {
          font-size: 12px;
          color: var(--text2);
        }
        .config-block input {
          width: 100%;
          height: 42px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg3) 90%, white 10%);
          color: var(--text);
          padding: 0 12px;
        }
        .config-block input:focus {
          border-color: var(--ai-border);
        }
        .api-key-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
        }
        .api-key-row button,
        .primary-btn,
        .secondary-btn {
          height: 42px;
          border-radius: 10px;
          border: 1px solid var(--border);
          padding: 0 16px;
          cursor: pointer;
          color: var(--text);
        }
        .api-key-row button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .api-key-row button,
        .secondary-btn {
          background: color-mix(in srgb, var(--bg3) 90%, white 10%);
        }
        .primary-btn {
          background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 78%, #163a75 22%));
          border-color: var(--ai-border);
          color: white;
        }
        .field-hint {
          font-size: 11px;
          color: var(--text3);
        }
        .dialog-actions {
          margin-top: auto;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
      `}</style>
    </div>
  );
}
