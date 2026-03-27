// src/ai/ollama-provider.ts
import { AIProvider, ErrorContext, CommandExplanation, CompletionContext, Suggestion } from './provider';
import { PROMPTS } from './prompts';

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
}

export class OllamaProvider implements AIProvider {
  name = 'Ollama';

  constructor(private config: OllamaConfig = {}) {}

  private get baseUrl(): string {
    return this.config.baseUrl ?? 'http://localhost:11434';
  }

  private get model(): string {
    return this.config.model ?? 'llama3';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const r = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000)
      });
      return r.ok;
    } catch {
      return false;
    }
  }

  async *explainError(ctx: ErrorContext): AsyncGenerator<string> {
    const prompt = PROMPTS.explainError(ctx);
    yield* this.streamRequest(prompt);
  }

  async *naturalToCommand(input: string, shell: string): AsyncGenerator<string> {
    const prompt = PROMPTS.naturalToCommand(input, shell);
    yield* this.streamRequest(prompt);
  }

  async explainCommand(command: string): Promise<CommandExplanation> {
    const prompt = PROMPTS.explainCommand(command);
    const response = await this.request(prompt);
    return JSON.parse(response);
  }

  async suggestCompletion(ctx: CompletionContext): Promise<Suggestion[]> {
    return [];
  }

  private async *streamRequest(prompt: string): AsyncGenerator<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt, stream: true })
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        const data = JSON.parse(line);
        if (data.response) yield data.response;
      }
    }
  }

  private async request(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt })
    });
    const data = await res.json();
    return data.response ?? '';
  }
}
