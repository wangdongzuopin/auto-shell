import { OpenAIProvider, OpenAIConfig } from './openai-provider';

export interface MiniMaxConfig extends OpenAIConfig {}

export class MiniMaxProvider extends OpenAIProvider {
  constructor(config: MiniMaxConfig) {
    super({
      ...config,
      name: 'MiniMax'
    });
  }
}
