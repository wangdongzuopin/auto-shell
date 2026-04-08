import React, { useEffect, useMemo, useState } from 'react';
import type { ProviderType } from '../../store/settings';
import { useSettingsStore } from '../../store/settings';
import { toast } from '../Toast';
import { FeatureToggles } from './FeatureToggles';
import { ModelConfigDialog } from './ModelConfigDialog';

const PROVIDERS: Array<{
  id: ProviderType;
  name: string;
  desc: string;
  apiKeyRequired: boolean;
}> = [
  { id: 'minimax', name: 'MiniMax', desc: 'OpenAI 兼容，官方 https://api.minimaxi.com/v1', apiKeyRequired: true },
  { id: 'glm', name: 'GLM', desc: '智谱开放平台', apiKeyRequired: true },
  { id: 'claude', name: 'Claude', desc: 'Anthropic', apiKeyRequired: true },
  { id: 'openai', name: 'OpenAI', desc: '官方接口', apiKeyRequired: true },
  { id: 'ollama', name: 'Ollama', desc: '本地模型服务', apiKeyRequired: false },
  { id: 'openaiCompatible', name: '兼容接口', desc: '任意 OpenAI 兼容网关', apiKeyRequired: true }
];

export function AIProviders() {
  const { aiSettings, setProvider } = useSettingsStore();
  const activeProvider = aiSettings.provider;
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeProviderMeta = useMemo(
    () => PROVIDERS.find((provider) => provider.id === activeProvider),
    [activeProvider]
  );

  useEffect(() => {
    const run = async () => {
      setChecking(true);
      try {
        setAvailable(await window.api.checkAIAvailable());
      } catch {
        setAvailable(false);
      } finally {
        setChecking(false);
      }
    };

    void run();
  }, [activeProvider, aiSettings.configs]);

  const handleSelectProvider = async (provider: ProviderType) => {
    await setProvider(provider);
    toast(`当前模型已切换为 ${PROVIDERS.find((item) => item.id === provider)?.name ?? provider}`);
  };

  return (
    <div className="ai-providers">
      <div className="settings-section">
        <div className="section-title">当前模型</div>
        <div className="current-provider-card">
          <div>
            <div className="current-provider-name">{activeProviderMeta?.name}</div>
            <div className="current-provider-desc">{activeProviderMeta?.desc}</div>
            <div className="current-provider-model">
              {aiSettings.configs[activeProvider].model}
            </div>
          </div>
          <button className="open-config-btn" onClick={() => setDialogOpen(true)}>
            配置模型
          </button>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-title">快速切换</div>
        <div className="provider-grid">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              className={`provider-item ${activeProvider === provider.id ? 'active' : ''}`}
              onClick={() => void handleSelectProvider(provider.id)}
            >
              <span className="provider-name">{provider.name}</span>
              <span className="provider-desc">{provider.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="section-title">连接状态</div>
        <div className={`status-card ${available ? 'ok' : 'off'}`}>
          <div className="status-dot" />
          <div>
            <div className="status-title">
              {checking ? '正在检测模型连接...' : available ? '模型连接正常' : '模型暂不可用'}
            </div>
            <div className="status-desc">
              {activeProviderMeta?.apiKeyRequired
                ? '请确认 API Key、Base URL 和模型名是否填写正确。'
                : '请确认 Ollama 服务已启动，并且本机可访问。'}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-title">AI 功能</div>
        <FeatureToggles />
      </div>

      <ModelConfigDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />

      <style>{`
        .ai-providers { display: flex; flex-direction: column; gap: 18px; }
        .settings-section { display: flex; flex-direction: column; gap: 12px; }
        .section-title {
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--text3);
          font-weight: 700;
        }
        .current-provider-card,
        .status-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
        }
        .current-provider-name,
        .status-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }
        .current-provider-desc,
        .status-desc {
          font-size: 12px;
          color: var(--text2);
          line-height: 1.5;
        }
        .current-provider-model {
          margin-top: 6px;
          font-family: var(--mono);
          font-size: 11px;
          color: #8cb3ff;
        }
        .open-config-btn {
          border: 1px solid rgba(76,141,255,0.35);
          background: rgba(76,141,255,0.12);
          color: var(--text);
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
          white-space: nowrap;
        }
        .open-config-btn:hover {
          background: rgba(76,141,255,0.18);
        }
        .provider-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .provider-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          border: 1px solid var(--border);
          background: var(--bg3);
          color: var(--text);
          padding: 12px 14px;
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
        }
        .provider-item:hover {
          border-border-color: rgba(76,141,255,0.28);
        }
        .provider-item.active {
          border-border-color: rgba(76,141,255,0.45);
          background: rgba(76,141,255,0.08);
        }
        .provider-name {
          font-size: 13px;
          font-weight: 600;
        }
        .provider-desc {
          font-size: 11px;
          color: var(--text2);
        }
        .status-card {
          justify-content: flex-start;
          align-items: flex-start;
        }
        .status-card.ok {
          border-border-color: rgba(71,209,108,0.28);
          background: rgba(71,209,108,0.08);
        }
        .status-card.off {
          border-border-color: rgba(255,255,255,0.08);
        }
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-top: 5px;
          background: ${available ? 'var(--green)' : 'var(--yellow)'};
          box-shadow: 0 0 0 4px rgba(255,255,255,0.04);
        }
      `}</style>
    </div>
  );
}
