import type { ChatMessage } from '../shared/types';
import { PROMPTS } from './prompts';
import { formatFetchFailureError } from './fetch-errors';
import { AIProvider, CommandExplanation, CompletionContext, ErrorContext, Suggestion } from './provider';

/** OpenAI 兼容接口在 baseUrl 后拼接 /chat/completions；裸域名需补 /v1，已有路径则保留（如智谱、自建网关）。 */
function normalizeOpenAiCompatBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return 'https://api.openai.com/v1';
  }
  try {
    const parsed = new URL(trimmed);
    const path = parsed.pathname.replace(/\/+$/, '') || '';
    if (path === '') {
      return `${parsed.origin}/v1`;
    }
    return `${parsed.origin}${path}`;
  } catch {
    return trimmed;
  }
}

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
    return normalizeOpenAiCompatBaseUrl(this.config.baseUrl ?? 'https://api.openai.com/v1');
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
    } catch (e) {
      console.warn(`[AI:${this.name}] isAvailable fetch failed`, formatFetchFailureError(e));
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

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
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

    const contentType = response.headers.get('content-type') ?? '';

    // 部分服务在 stream:true 时仍返回整段 JSON（非 SSE），需走非流式解析以免 JSON.parse 在 SSE 解析中报错
    if (contentType.includes('application/json')) {
      const raw = await response.text();
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`${this.name} 返回了无法解析的 JSON，请检查 Base URL 是否指向 chat/completions。`);
      }
      const errMsg = formatOpenAIErrorPayload(data);
      if (errMsg) {
        throw new Error(`${this.name}: ${errMsg}`);
      }
      const textOut = extractOpenAIText(data);
      if (!textOut?.trim()) {
        throw new Error(`${this.name} 已调用成功，但返回内容为空。请检查模型名称是否与接口一致。`);
      }
      onChunk(textOut);
      return textOut.trim();
    }

    let output = '';
    await readSseStream(this.name, response, (payload) => {
      const errMsg = formatOpenAIErrorPayload(payload);
      if (errMsg) {
        throw new Error(`${this.name}: ${errMsg}`);
      }
      const chunk = extractOpenAIStreamChunk(payload);
      if (chunk) {
        output += chunk;
        onChunk(chunk);
      }
    });

    if (!output.trim()) {
      throw new Error(
        `${this.name} 已调用成功，但流式内容为空。请确认接口支持 SSE（text/event-stream），且模型 ID 正确。`
      );
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

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
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

function formatOpenAIErrorPayload(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const err = (data as { error?: unknown }).error;
  if (err == null) {
    return null;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function readSseStream(
  providerName: string,
  response: Response,
  onPayload: (payload: any) => void
): Promise<void> {
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
    buffer = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
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

      try {
        onPayload(JSON.parse(payloadText));
      } catch (e) {
        console.warn(`[AI:${providerName}] 跳过无法解析的 SSE 片段`, {
          preview: payloadText.slice(0, 160),
          error: e instanceof Error ? e.message : e
        });
      }
    }
  }
}
