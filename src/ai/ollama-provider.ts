import type { ChatMessage } from '../shared/types';
import { PROMPTS } from './prompts';
import { AIProvider, CommandExplanation, CompletionContext, ErrorContext, Suggestion } from './provider';

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
    return this.config.model ?? 'qwen2.5:7b';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        messages
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama 请求失败: ${response.status} ${text}`);
    }

    const data = await response.json();
    const text = data.message?.content?.trim?.() ?? '';
    if (!text) {
      throw new Error('Ollama 已调用成功，但返回内容为空。');
    }
    return text;
  }

  async streamChat(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        stream: true,
        messages
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama 请求失败: ${response.status} ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Ollama 响应不支持流式读取。');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let output = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }

        const payload = JSON.parse(trimmed);
        const chunk = payload?.message?.content ?? '';
        if (chunk) {
          output += chunk;
          onChunk(chunk);
        }
      }
    }

    if (!output.trim()) {
      throw new Error('Ollama 已调用成功，但流式内容为空。');
    }

    return output.trim();
  }

  async explainError(ctx: ErrorContext): Promise<string> {
    return this.chat([{ role: 'user', content: PROMPTS.explainError(ctx) }]);
  }

  async naturalToCommand(input: string, shell: string): Promise<string> {
    return this.chat([{ role: 'user', content: PROMPTS.naturalToCommand(input, shell) }]);
  }

  async explainCommand(command: string): Promise<CommandExplanation> {
    const response = await this.chat([{ role: 'user', content: PROMPTS.explainCommand(command) }]);
    return JSON.parse(response);
  }

  async suggestCompletion(_ctx: CompletionContext): Promise<Suggestion[]> {
    return [];
  }
}
