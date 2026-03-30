import type { ChatMessage } from '../shared/types';
import { PROMPTS } from './prompts';
import { AIProvider, CommandExplanation, CompletionContext, ErrorContext, Suggestion } from './provider';

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  name?: string;
}

export class OpenAIProvider implements AIProvider {
  name: string;

  constructor(private config: OpenAIConfig) {
    this.name = config.name ?? 'OpenAI Compatible';
  }

  private get baseUrl(): string {
    return this.config.baseUrl ?? 'https://api.openai.com/v1';
  }

  private get model(): string {
    return this.config.model ?? 'gpt-4o-mini';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`
        },
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const data = await this.requestChat(messages, false);
    const text = extractOpenAIText(data);
    if (!text) {
      console.warn(`[AI:${this.name}] empty response payload`, {
        payloadPreview: JSON.stringify(data).slice(0, 600)
      });
      throw new Error(`${this.name} 已调用成功，但返回内容为空。请检查模型响应格式。`);
    }

    return text;
  }

  async streamChat(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
    console.info(`[AI:${this.name}] stream request`, {
      baseUrl: this.baseUrl,
      model: this.model,
      messageCount: messages.length
    });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[AI:${this.name}] stream request failed`, {
        status: response.status,
        bodyPreview: text.slice(0, 400)
      });
      throw new Error(`${this.name} 请求失败: ${response.status} ${text}`);
    }

    let output = '';
    await readSseStream(response, (payload) => {
      const chunk = extractOpenAIStreamChunk(payload);
      if (chunk) {
        output += chunk;
        onChunk(chunk);
      }
    });

    if (!output.trim()) {
      throw new Error(`${this.name} 已调用成功，但流式内容为空。请检查模型响应格式。`);
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

  private async requestChat(messages: ChatMessage[], stream: boolean): Promise<any> {
    console.info(`[AI:${this.name}] request`, {
      baseUrl: this.baseUrl,
      model: this.model,
      messageCount: messages.length,
      stream
    });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream
      })
    });

    const rawText = await response.text();
    if (!response.ok) {
      console.error(`[AI:${this.name}] request failed`, {
        status: response.status,
        bodyPreview: rawText.slice(0, 400)
      });
      throw new Error(`${this.name} 请求失败: ${response.status} ${rawText}`);
    }

    return JSON.parse(rawText);
  }
}

function extractOpenAIText(data: any): string {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .filter((item: any) => item?.type === 'text' && typeof item?.text === 'string')
      .map((item: any) => item.text)
      .join('\n')
      .trim();
  }
  return '';
}

function extractOpenAIStreamChunk(payload: any): string {
  const delta = payload?.choices?.[0]?.delta?.content;
  if (typeof delta === 'string') {
    return delta;
  }
  if (Array.isArray(delta)) {
    return delta
      .filter((item: any) => item?.type === 'text' && typeof item?.text === 'string')
      .map((item: any) => item.text)
      .join('');
  }
  return '';
}

async function readSseStream(response: Response, onPayload: (payload: any) => void): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('模型响应不支持流式读取。');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const segments = buffer.split('\n\n');
    buffer = segments.pop() ?? '';

    for (const segment of segments) {
      const lines = segment
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const dataLines = lines.filter((line) => line.startsWith('data:'));
      if (dataLines.length === 0) {
        continue;
      }

      const payloadText = dataLines.map((line) => line.slice(5).trim()).join('\n');
      if (!payloadText || payloadText === '[DONE]') {
        continue;
      }

      onPayload(JSON.parse(payloadText));
    }
  }
}
