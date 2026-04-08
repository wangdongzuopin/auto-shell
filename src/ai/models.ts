export interface ModelPreset {
  id: string;
  name: string;
  brand: string;
  baseUrl: string;
  apiPath: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
}

export const MODEL_PRESETS: Record<string, ModelPreset> = {
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    brand: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiPath: '/v1/messages',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    brand: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiPath: '/v1/messages',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    brand: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiPath: '/v1/chat/completions',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    brand: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiPath: '/v1/chat/completions',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'MiniMax-M2.7': {
    id: 'MiniMax-M2.7',
    name: 'MiniMax M2.7',
    brand: 'MiniMax',
    baseUrl: 'https://api.minimaxi.com/v1',
    apiPath: '/chat/completions',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'glm-4': {
    id: 'glm-4',
    name: 'GLM-4',
    brand: 'Zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiPath: '/chat/completions',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'llama3': {
    id: 'llama3',
    name: 'Llama 3',
    brand: 'Ollama',
    baseUrl: 'http://localhost:11434',
    apiPath: '/api/chat',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
};

export function getModelPreset(modelId: string): ModelPreset | undefined {
  return MODEL_PRESETS[modelId];
}

export function getAllModelPresets(): ModelPreset[] {
  return Object.values(MODEL_PRESETS);
}
