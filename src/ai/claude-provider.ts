// src/ai/claude-provider.ts
import { AIProvider, ErrorContext, CommandExplanation, CompletionContext, Suggestion } from './provider';
import { PROMPTS } from './prompts';

export interface ClaudeConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export class ClaudeProvider implements AIProvider {
  name = 'Claude';

  constructor(private config: ClaudeConfig) {}

  private get baseUrl(): string {
    return this.config.baseUrl ?? 'https://api.anthropic.com';
  }

  private get model(): string {
    return this.config.model ?? 'claude-sonnet-4-20250514';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    try {
      const r = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({ model: this.model, max_tokens: 1, messages: [] }),
        signal: AbortSignal.timeout(3000)
      });
      return r.ok || r.status === 400; // 400 means auth worked
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
    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        max_tokens: 4096
      })
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n').filter(Boolean);
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content_block_delta' && data.delta?.text) {
            yield data.delta.text;
          }
        }
      }
    }
  }

  private async request(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096
      })
    });
    const data = await res.json();
    return data.content?.[0]?.text ?? '';
  }
}
