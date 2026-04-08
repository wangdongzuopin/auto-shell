import type { ProviderType } from '../shared/types';
import type { AIProvider } from './provider';
import { ClaudeProvider } from './claude-provider';
import { OllamaProvider } from './ollama-provider';
import { MiniMaxProvider } from './minimax-provider';
import { OpenAIProvider } from './openai-provider';
import { MODEL_PRESETS, getModelPreset } from './models';

export type { ProviderType } from '../shared/types';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export function createProvider(config: ProviderConfig): AIProvider {
  // If model is provided, look up preset configuration
  let finalConfig = config;
  if (config.model && MODEL_PRESETS[config.model]) {
    const preset = MODEL_PRESETS[config.model];
    // Map brand to provider type
    const brandToType: Record<string, ProviderType> = {
      'Anthropic': 'claude',
      'OpenAI': 'openai',
      'MiniMax': 'minimax',
      'Zhipu': 'glm',
      'Ollama': 'ollama',
    };
    finalConfig = {
      ...config,
      type: config.type || brandToType[preset.brand] || config.type,
      baseUrl: config.baseUrl || preset.baseUrl,
      model: preset.id,
    };
  }

  switch (finalConfig.type) {
    case 'minimax':
      return new MiniMaxProvider({
        apiKey: finalConfig.apiKey ?? '',
        baseUrl: finalConfig.baseUrl ?? 'https://api.minimaxi.com/v1',
        model: finalConfig.model ?? 'MiniMax-M2.7'
      });
    case 'glm':
      return new OpenAIProvider({
        name: 'GLM',
        apiKey: finalConfig.apiKey ?? '',
        baseUrl: finalConfig.baseUrl ?? 'https://open.bigmodel.cn/api/paas/v4',
        model: finalConfig.model ?? 'glm-4.5'
      });
    case 'claude':
      return new ClaudeProvider({
        apiKey: finalConfig.apiKey ?? '',
        baseUrl: finalConfig.baseUrl ?? 'https://api.anthropic.com',
        model: finalConfig.model ?? 'claude-3-7-sonnet-latest'
      });
    case 'openai':
      return new OpenAIProvider({
        name: 'OpenAI',
        apiKey: finalConfig.apiKey ?? '',
        baseUrl: finalConfig.baseUrl ?? 'https://api.openai.com/v1',
        model: finalConfig.model ?? 'gpt-4o-mini'
      });
    case 'openaiCompatible':
      return new OpenAIProvider({
        name: 'OpenAI Compatible',
        apiKey: finalConfig.apiKey ?? '',
        baseUrl: finalConfig.baseUrl ?? 'https://api.openai.com/v1',
        model: finalConfig.model ?? 'gpt-4o-mini'
      });
    case 'ollama':
      return new OllamaProvider({
        baseUrl: finalConfig.baseUrl ?? 'http://localhost:11434',
        model: finalConfig.model ?? 'qwen2.5:7b'
      });
    default:
      throw new Error(`Unknown provider type: ${finalConfig.type}`);
  }
}

export type { AIProvider, CommandExplanation, CompletionContext, ErrorContext, Suggestion } from './provider';
export { PROMPTS } from './prompts';
export { MODEL_PRESETS, getModelPreset, getAllModelPresets } from './models';
export type { ModelPreset } from './models';
