// src/ai/index.ts
import type { AIProvider } from './provider';
import { MiniMaxProvider, MiniMaxConfig } from './minimax-provider';
import { OllamaProvider, OllamaConfig } from './ollama-provider';
import { ClaudeProvider, ClaudeConfig } from './claude-provider';
import { OpenAIProvider, OpenAIConfig } from './openai-provider';

export type ProviderType = 'minimax' | 'claude' | 'openai' | 'ollama';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.type) {
    case 'minimax':
      return new MiniMaxProvider({
        apiKey: config.apiKey ?? '',
        baseUrl: config.baseUrl ?? 'https://api.minimaxi.com/v1',
        model: config.model ?? 'MiniMax-M2.7'
      });
    case 'ollama':
      return new OllamaProvider({
        baseUrl: config.baseUrl ?? 'http://localhost:11434',
        model: config.model ?? 'llama3'
      });
    case 'claude':
      return new ClaudeProvider({
        apiKey: config.apiKey ?? '',
        baseUrl: config.baseUrl ?? 'https://api.anthropic.com',
        model: config.model ?? 'claude-sonnet-4-20250514'
      });
    case 'openai':
      return new OpenAIProvider({
        apiKey: config.apiKey ?? '',
        baseUrl: config.baseUrl ?? 'https://api.openai.com/v1',
        model: config.model ?? 'gpt-4o'
      });
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

export type { AIProvider, ErrorContext, CommandExplanation, CompletionContext, Suggestion } from './provider';
export { PROMPTS } from './prompts';
