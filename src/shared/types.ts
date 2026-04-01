export type ProviderType =
  | 'minimax'
  | 'glm'
  | 'claude'
  | 'openai'
  | 'ollama'
  | 'openaiCompatible';

export interface Theme {
  name: string;
  background: string;
  foreground: string;
  accent: string;
}

export interface FeatureToggles {
  errorCard: boolean;
  naturalCommand: boolean;
  explainCommand: boolean;
  completion: boolean;
}

export interface ProviderSettings {
  baseUrl: string;
  model: string;
}

export type ProviderConfigs = Record<ProviderType, ProviderSettings>;

export interface AppConfig {
  provider: ProviderType;
  providerConfig: ProviderSettings;
  providerConfigs: ProviderConfigs;
  aiFeatures: FeatureToggles;
  theme: Theme;
}

export interface ModelConfig {
  baseUrl?: string;        // 自定义端点（可选）
  temperature?: number;     // 可选自定义
  maxTokens?: number;       // 可选自定义
}

export interface AppConfig {
  provider: ProviderType;
  providerConfig: ProviderSettings;
  providerConfigs: ProviderConfigs;
  aiFeatures: FeatureToggles;
  theme: Theme;
  // 新增
  currentModel: string;     // 'claude-3-5-sonnet'
  modelConfig: ModelConfig; // 用户自定义配置
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
