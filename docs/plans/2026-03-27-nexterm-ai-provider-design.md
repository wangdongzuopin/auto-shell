# NexTerm AI 模块设计文档

**版本**: v0.1
**状态**: 已批准
**更新日期**: 2026-03-27

---

## 1. 技术选型

### AI Provider 架构

```
AIProvider (interface)
├── OllamaProvider         (本地模型, localhost:11434)
├── OpenAIProvider         (OpenAI API, api.openai.com)
├── ClaudeProvider         (Claude API, api.anthropic.com)
├── MiniMaxProvider        (OpenAI 兼容格式) ← 新增
└── MiniMaxAnthropicProvider (Anthropic 兼容格式) ← 新增
```

### MiniMax Provider 配置

| 配置项 | 值 | 来源 |
|--------|-----|------|
| Base URL | `https://api.minimaxi.com/v1` | cc-switch |
| Model | `MiniMax-M2.7` | cc-switch |
| API Format | OpenAI Chat Completions | cc-switch |

---

## 2. AI Provider 接口定义

```typescript
// ai/provider.ts
export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;

  explainError(ctx: ErrorContext): AsyncGenerator<string>;
  naturalToCommand(input: string, shell: string): AsyncGenerator<string>;
  explainCommand(command: string): Promise<CommandExplanation>;
  suggestCompletion(ctx: CompletionContext): Promise<Suggestion[]>;
}
```

---

## 3. MiniMax Provider 实现

```typescript
// ai/minimax-provider.ts
export class MiniMaxProvider implements AIProvider {
  name = 'MiniMax';

  constructor(
    private baseUrl: string = 'https://api.minimaxi.com/v1',
    private model: string = 'MiniMax-M2.7'
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const r = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(2000)
      });
      return r.ok;
    } catch { return false; }
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
    // ...
  }

  private async *streamRequest(prompt: string): AsyncGenerator<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
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
      const lines = decoder.decode(value).split('\n').filter(Boolean);
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
        'Authorization': `Bearer ${this.apiKey}`
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
```

---

## 4. AI 设置页面设计

### Provider 选择列表

```tsx
// renderer/components/Settings/AIProviders.tsx
const AI_PROVIDERS = [
  { id: 'minimax', name: 'MiniMax (推荐)', desc: '云端', icon: 'minimax', color: '#FF6B6B' },
  { id: 'claude', name: 'Claude (Anthropic)', desc: '云端', icon: 'claude', color: '#FF6B6B' },
  { id: 'openai', name: 'OpenAI', desc: '云端', icon: 'openai', color: '#FF6B6B' },
  { id: 'ollama', name: 'Ollama (本地)', desc: '离线', icon: 'ollama', color: '#FF6B6B' },
];
```

### Provider 配置表

| Provider | Base URL | Model | API Format |
|----------|----------|-------|------------|
| MiniMax | `https://api.minimaxi.com/v1` | `MiniMax-M2.7` | OpenAI |
| Claude | `https://api.anthropic.com` | `claude-sonnet-4-20250514` | Anthropic |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` | OpenAI |
| Ollama | `http://localhost:11434` | `llama3` | OpenAI (本地) |

---

## 5. 密钥存储

- 使用 keytar 存储到 Windows Credential Manager
- Service name: `NexTerm`
- 渲染进程不持有 API Key，通过 IPC 调用主进程

---

## 6. 实现优先级

1. AI Provider 抽象接口层
2. MiniMax Provider 实现
3. AI 设置页面（Provider 选择 + 配置）
4. 其他 Provider 实现（Claude / OpenAI / Ollama）

---

## 7. 参考资料

- cc-switch 配置: `C:\Users\jelly\.cc-switch\cc-switch.db`
- MiniMax API 格式: OpenAI Chat Completions 兼容
