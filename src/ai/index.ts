import type { ProviderType } from '../shared/types';
import type { AIProvider } from './provider';
import { ClaudeProvider } from './claude-provider';
import { OllamaProvider } from './ollama-provider';
import { OpenAIProvider } from './openai-provider';

export type { ProviderType } from '../shared/types';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.type) {
    case 'minimax':
      return new ClaudeProvider({
        apiKey: config.apiKey ?? '',
        baseUrl: config.baseUrl ?? 'https://api.minimaxi.com/anthropic',
        model: config.model ?? 'MiniMax-M2.7'
      });
    case 'glm':
      return new OpenAIProvider({
        name: 'GLM',
        apiKey: config.apiKey ?? '',
        baseUrl: config.baseUrl ?? 'https://open.bigmodel.cn/api/paas/v4',
        model: config.model ?? 'glm-4.5'
      });
    case 'claude':
      return new ClaudeProvider({
        apiKey: config.apiKey ?? '',
        baseUrl: config.baseUrl ?? 'https://api.anthropic.com',
        model: config.model ?? 'claude-3-7-sonnet-latest'
      });
    case 'openai':
      return new OpenAIProvider({
        name: 'OpenAI',
        apiKey: config.apiKey ?? '',
        baseUrl: config.baseUrl ?? 'https://api.openai.com/v1',
        model: config.model ?? 'gpt-4o-mini'
      });
    case 'openaiCompatible':
      return new OpenAIProvider({
        name: 'OpenAI Compatible',
        apiKey: config.apiKey ?? '',
        baseUrl: config.baseUrl ?? 'https://api.openai.com/v1',
        model: config.model ?? 'gpt-4o-mini'
      });
    case 'ollama':
      return new OllamaProvider({
        baseUrl: config.baseUrl ?? 'http://localhost:11434',
        model: config.model ?? 'qwen2.5:7b'
      });
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

export type { AIProvider, CommandExplanation, CompletionContext, ErrorContext, Suggestion } from './provider';
export { PROMPTS } from './prompts';
