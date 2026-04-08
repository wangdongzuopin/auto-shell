import type { ChatMessage } from '../shared/types';
import { PROMPTS } from './prompts';
import { formatFetchFailureError } from './fetch-errors';
import { AIProvider, CommandExplanation, CompletionContext, ErrorContext, Suggestion } from './provider';

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
    return this.config.model ?? 'claude-3-7-sonnet-latest';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 8,
          messages: [{ role: 'user', content: 'ping' }]
        }),
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (e) {
      console.warn(`[AI:${this.name}] isAvailable fetch failed`, formatFetchFailureError(e));
      return false;
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const { rawText, data } = await this.requestMessage(messages, false);
    const text = extractClaudeText(data);
    if (!text) {
      console.warn(`[AI:${this.name}] empty response body`, {
        bodyPreview: rawText.slice(0, 600)
      });
      throw new Error(`${this.name} 已调用成功，但返回内容为空。请检查模型响应格式。`);
    }

    return text;
  }

  async streamChat(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
    const body = buildClaudeRequestBody(messages, this.model, true);
    console.info(`[AI:${this.name}] stream request`, {
      baseUrl: this.baseUrl,
      model: this.model,
      messageCount: body.messages.length,
      hasSystemPrompt: Boolean(body.system)
    });

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error(`${this.name} ${formatFetchFailureError(e)}`);
    }

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
      const chunk = extractClaudeStreamChunk(payload);
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

  private async requestMessage(messages: ChatMessage[], stream: boolean) {
    const requestBody = buildClaudeRequestBody(messages, this.model, stream);

    console.info(`[AI:${this.name}] request`, {
      baseUrl: this.baseUrl,
      model: this.model,
      messageCount: requestBody.messages.length,
      hasSystemPrompt: Boolean(requestBody.system),
      stream
    });

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });
    } catch (e) {
      throw new Error(`${this.name} ${formatFetchFailureError(e)}`);
    }

    const rawText = await response.text();
    if (!response.ok) {
      console.error(`[AI:${this.name}] request failed`, {
        status: response.status,
        bodyPreview: rawText.slice(0, 400)
      });
      throw new Error(`${this.name} 请求失败: ${response.status} ${rawText}`);
    }

    return {
      rawText,
      data: JSON.parse(rawText)
    };
  }
}

function buildClaudeRequestBody(messages: ChatMessage[], model: string, stream: boolean) {
  const system = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');
  const normalizedMessages = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content
    }));

  return {
    model,
    max_tokens: 4096,
    system: system || undefined,
    messages: normalizedMessages,
    stream
  };
}

function extractClaudeText(data: any): string {
  if (!Array.isArray(data?.content)) {
    return '';
  }

  return data.content
    .filter((block: any) => block?.type === 'text' && typeof block?.text === 'string')
    .map((block: any) => block.text)
    .join('\n')
    .trim();
}

function extractClaudeStreamChunk(payload: any): string {
  if (payload?.type === 'content_block_delta' && typeof payload?.delta?.text === 'string') {
    return payload.delta.text;
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
