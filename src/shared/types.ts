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

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
