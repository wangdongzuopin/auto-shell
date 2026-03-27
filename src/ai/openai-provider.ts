// src/ai/openai-provider.ts
import { AIProvider, ErrorContext, CommandExplanation, CompletionContext, Suggestion } from './provider';
import { PROMPTS } from './prompts';

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI';

  constructor(private config: OpenAIConfig) {}

  private get baseUrl(): string {
    return this.config.baseUrl ?? 'https://api.openai.com/v1';
  }

  private get model(): string {
    return this.config.model ?? 'gpt-4o';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    try {
      const r = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
        signal: AbortSignal.timeout(3000)
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
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        stream: true
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
          if (data.choices?.[0]?.delta?.content) {
            yield data.choices[0].delta.content;
          }
        }
      }
    }
  }

  private async request(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }
}
