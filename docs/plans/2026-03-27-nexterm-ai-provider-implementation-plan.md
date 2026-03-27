# NexTerm AI Provider 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 NexTerm 的 AI Provider 抽象层及 MiniMax/Claude/OpenAI/Ollama 四个 Provider

**Architecture:**
- AI 模块采用 Provider 模式，通过统一接口屏蔽不同后端差异
- 主进程持有 API Key，渲染进程通过 IPC 调用 AI 服务
- Provider 支持流式输出（AsyncGenerator），提升用户体验

**Tech Stack:** TypeScript, Electron, React, keytar, electron-store

---

## 任务 1: 创建项目基础结构

**Files:**
- Create: `src/ai/provider.ts`
- Create: `src/ai/prompts.ts`
- Create: `src/ai/context-builder.ts`
- Create: `src/shared/types.ts`
- Create: `src/shared/ipc-channels.ts`

**Step 1: 创建目录结构**

```bash
mkdir -p src/ai src/shared
```

**Step 2: 创建 AI Provider 接口定义**

```typescript
// src/ai/provider.ts
export interface ErrorContext {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  shell: string;
  cwd: string;
}

export interface CommandExplanation {
  summary: string;
  parts: { token: string; meaning: string }[];
  variants?: string[];
}

export interface CompletionContext {
  input: string;
  cwd: string;
  shell: string;
  history: string[];
}

export interface Suggestion {
  text: string;
  description: string;
  confidence: number;
}

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  explainError(ctx: ErrorContext): AsyncGenerator<string>;
  naturalToCommand(input: string, shell: string): AsyncGenerator<string>;
  explainCommand(command: string): Promise<CommandExplanation>;
  suggestCompletion(ctx: CompletionContext): Promise<Suggestion[]>;
}
```

**Step 3: 创建 IPC 频道定义**

```typescript
// src/shared/ipc-channels.ts
export const IPC = {
  // AI
  AI_EXPLAIN_ERROR:   'ai:explain-error',
  AI_NATURAL_CMD:     'ai:natural-cmd',
  AI_EXPLAIN_CMD:     'ai:explain-cmd',
  AI_COMPLETION:      'ai:completion',
  AI_STREAM_CHUNK:    'ai:stream-chunk',
  AI_STREAM_DONE:     'ai:stream-done',
  AI_CHECK_AVAILABLE: 'ai:check-available',

  // Config
  CONFIG_GET:  'config:get',
  CONFIG_SET:  'config:set',
  KEY_SAVE:    'key:save',
  KEY_GET:     'key:get',
} as const;
```

**Step 4: 创建 Prompt 模板**

```typescript
// src/ai/prompts.ts
export const PROMPTS = {
  explainError: (ctx: ErrorContext) => `
你是一个 Windows 终端助手。用户在 ${ctx.shell} 中执行了命令并遇到错误。

命令: ${ctx.command}
退出码: ${ctx.exitCode}
错误输出:
${ctx.stderr.slice(-1000)}

请用中文回复，格式严格如下（JSON）：
{
  "reason": "一句话解释错误原因",
  "fixes": [
    { "description": "修复方案描述", "command": "具体命令" }
  ]
}
只输出 JSON，不要其他内容。`,

  naturalToCommand: (input: string, shell: string) => `
将以下自然语言描述转换为 ${shell} 命令。
只输出命令本身，不要解释。

描述: ${input}
命令:`,

  explainCommand: (command: string) => `
解释以下终端命令，用中文回复，格式为 JSON：
{
  "summary": "命令整体作用（一句话）",
  "parts": [
    { "token": "命令或参数", "meaning": "含义" }
  ]
}

命令: ${command}
只输出 JSON。`,
};
```

**Step 5: Commit**

```bash
git add src/ai/provider.ts src/ai/prompts.ts src/shared/types.ts src/shared/ipc-channels.ts
git commit -m "feat: add AI provider interface and shared types"
```

---

## 任务 2: 创建 MiniMax Provider

**Files:**
- Create: `src/ai/minimax-provider.ts`

**Step 1: 创建 MiniMax Provider 实现**

```typescript
// src/ai/minimax-provider.ts
import { AIProvider, ErrorContext, CommandExplanation, CompletionContext, Suggestion } from './provider';
import { PROMPTS } from './prompts';

export interface MiniMaxConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export class MiniMaxProvider implements AIProvider {
  name = 'MiniMax';

  constructor(private config: MiniMaxConfig) {}

  private get baseUrl(): string {
    return this.config.baseUrl ?? 'https://api.minimaxi.com/v1';
  }

  private get model(): string {
    return this.config.model ?? 'MiniMax-M2.7';
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

    if (!res.ok) {
      throw new Error(`MiniMax API error: ${res.status}`);
    }

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
```

**Step 2: Commit**

```bash
git add src/ai/minimax-provider.ts
git commit -m "feat: add MiniMax provider implementation"
```

---

## 任务 3: 创建 Ollama Provider

**Files:**
- Create: `src/ai/ollama-provider.ts`

**Step 1: 创建 Ollama Provider 实现**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/ai/ollama-provider.ts
git commit -m "feat: add Ollama provider implementation"
```

---

## 任务 4: 创建 Claude Provider

**Files:**
- Create: `src/ai/claude-provider.ts`

**Step 1: 创建 Claude Provider 实现**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/ai/claude-provider.ts
git commit -m "feat: add Claude provider implementation"
```

---

## 任务 5: 创建 OpenAI Provider

**Files:**
- Create: `src/ai/openai-provider.ts`

**Step 1: 创建 OpenAI Provider 实现**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/ai/openai-provider.ts
git commit -m "feat: add OpenAI provider implementation"
```

---

## 任务 6: 创建 AI Provider 工厂函数

**Files:**
- Create: `src/ai/index.ts`

**Step 1: 创建 AI 模块导出和工厂函数**

```typescript
// src/ai/index.ts
import { AIProvider } from './provider';
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

export { AIProvider, ErrorContext, CommandExplanation, CompletionContext, Suggestion } from './provider';
export { PROMPTS } from './prompts';
```

**Step 2: Commit**

```bash
git add src/ai/index.ts
git commit -m "feat: add AI provider factory function"
```

---

## 任务 7: 创建 electron-store 配置管理

**Files:**
- Create: `src/main/session-store.ts`

**Step 1: 创建 session-store.ts**

```typescript
// src/main/session-store.ts
import Store from 'electron-store';
import * as keytar from 'keytar';

const SERVICE = 'NexTerm';

interface StoreSchema {
  provider: 'minimax' | 'claude' | 'openai' | 'ollama';
  minimax: { baseUrl: string; model: string };
  claude: { baseUrl: string; model: string };
  openai: { baseUrl: string; model: string };
  ollama: { baseUrl: string; model: string };
  aiFeatures: {
    errorCard: boolean;
    naturalCommand: boolean;
    explainCommand: boolean;
    completion: boolean;
  };
  theme: {
    name: string;
    background: string;
    foreground: string;
    accent: string;
  };
}

const store = new Store<StoreSchema>({
  defaults: {
    provider: 'minimax',
    minimax: { baseUrl: 'https://api.minimaxi.com/v1', model: 'MiniMax-M2.7' },
    claude: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514' },
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
    ollama: { baseUrl: 'http://localhost:11434', model: 'llama3' },
    aiFeatures: {
      errorCard: true,
      naturalCommand: true,
      explainCommand: true,
      completion: false
    },
    theme: {
      name: 'NexTerm Dark',
      background: '#0e0f11',
      foreground: '#c9cdd6',
      accent: '#7c6af7'
    }
  }
});

export async function saveApiKey(provider: string, key: string): Promise<void> {
  await keytar.setPassword(SERVICE, provider, key);
}

export async function getApiKey(provider: string): Promise<string | null> {
  return keytar.getPassword(SERVICE, provider);
}

export async function deleteApiKey(provider: string): Promise<void> {
  await keytar.deletePassword(SERVICE, provider);
}

export function getConfig() {
  return {
    provider: store.get('provider'),
    providerConfig: store.get(store.get('provider')),
    aiFeatures: store.get('aiFeatures'),
    theme: store.get('theme')
  };
}

export function setProvider(provider: StoreSchema['provider']) {
  store.set('provider', provider);
}

export function setProviderConfig<T extends keyof Omit<StoreSchema, 'provider' | 'aiFeatures' | 'theme'>>(
  provider: T,
  config: StoreSchema[T]
) {
  store.set(provider, config);
}

export { store };
```

**Step 2: Commit**

```bash
git add src/main/session-store.ts
git commit -m "feat: add electron-store configuration management"
```

---

## 任务 8: 创建主进程 IPC 处理器

**Files:**
- Create: `src/main/ipc-handlers.ts`

**Step 1: 创建 IPC 处理器**

```typescript
// src/main/ipc-handlers.ts
import { ipcMain } from 'electron';
import { IPC } from '../shared/ipc-channels';
import { createProvider, ProviderConfig } from '../ai';
import { getApiKey, saveApiKey, getConfig, setProvider, setProviderConfig } from './session-store';

let currentProvider: ReturnType<typeof createProvider> | null = null;

async function getProvider() {
  if (currentProvider) return currentProvider;

  const config = getConfig();
  const apiKey = await getApiKey(config.provider);

  currentProvider = createProvider({
    type: config.provider,
    apiKey: apiKey ?? undefined,
    ...config.providerConfig
  } as ProviderConfig);

  return currentProvider;
}

export function registerIpcHandlers() {
  // AI handlers
  ipcMain.handle(IPC.AI_CHECK_AVAILABLE, async () => {
    const provider = await getProvider();
    return provider.isAvailable();
  });

  ipcMain.handle(IPC.AI_EXPLAIN_ERROR, async (event, ctx) => {
    const provider = await getProvider();
    return provider.explainError(ctx);
  });

  ipcMain.handle(IPC.AI_NATURAL_CMD, async (event, input, shell) => {
    const provider = await getProvider();
    return provider.naturalToCommand(input, shell);
  });

  ipcMain.handle(IPC.AI_EXPLAIN_CMD, async (event, command) => {
    const provider = await getProvider();
    return provider.explainCommand(command);
  });

  // Config handlers
  ipcMain.handle(IPC.CONFIG_GET, () => {
    return getConfig();
  });

  ipcMain.handle(IPC.CONFIG_SET, (event, key, value) => {
    if (key === 'provider') {
      setProvider(value);
      currentProvider = null; // Reset provider
    } else {
      setProviderConfig(key, value);
    }
    return true;
  });

  // Key handlers
  ipcMain.handle(IPC.KEY_GET, async (event, provider) => {
    return getApiKey(provider);
  });

  ipcMain.handle(IPC.KEY_SAVE, async (event, provider, key) => {
    await saveApiKey(provider, key);
    if (provider === getConfig().provider) {
      currentProvider = null; // Reset provider to pick up new key
    }
    return true;
  });
}
```

**Step 2: Commit**

```bash
git add src/main/ipc-handlers.ts
git commit -m "feat: add IPC handlers for AI and configuration"
```

---

## 任务 9: 创建 preload 脚本

**Files:**
- Create: `src/preload.ts`

**Step 1: 创建 preload 脚本**

```typescript
// src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './shared/ipc-channels';

export interface ElectronAPI {
  // AI
  checkAIAvailable: () => Promise<boolean>;
  explainError: (ctx: any) => Promise<AsyncGenerator<string>>;
  naturalToCommand: (input: string, shell: string) => Promise<AsyncGenerator<string>>;
  explainCommand: (command: string) => Promise<any>;

  // Config
  getConfig: () => Promise<any>;
  setConfig: (key: string, value: any) => Promise<boolean>;

  // Keys
  getKey: (provider: string) => Promise<string | null>;
  saveKey: (provider: string, key: string) => Promise<boolean>;

  // PTY
  createPty: (shell: string, cwd: string) => Promise<string>;
  writePty: (id: string, data: string) => void;
  resizePty: (id: string, cols: number, rows: number) => void;
  killPty: (id: string) => void;
  onPtyOutput: (callback: (id: string, data: string) => void) => void;
  onPtyExit: (callback: (id: string, code: number) => void) => void;
}

const api: ElectronAPI = {
  // AI
  checkAIAvailable: () => ipcRenderer.invoke(IPC.AI_CHECK_AVAILABLE),
  explainError: (ctx) => ipcRenderer.invoke(IPC.AI_EXPLAIN_ERROR, ctx),
  naturalToCommand: (input, shell) => ipcRenderer.invoke(IPC.AI_NATURAL_CMD, input, shell),
  explainCommand: (command) => ipcRenderer.invoke(IPC.AI_EXPLAIN_CMD, command),

  // Config
  getConfig: () => ipcRenderer.invoke(IPC.CONFIG_GET),
  setConfig: (key, value) => ipcRenderer.invoke(IPC.CONFIG_SET, key, value),

  // Keys
  getKey: (provider) => ipcRenderer.invoke(IPC.KEY_GET, provider),
  saveKey: (provider, key) => ipcRenderer.invoke(IPC.KEY_SAVE, provider, key),

  // PTY (placeholder for now)
  createPty: (shell, cwd) => ipcRenderer.invoke('pty:create', shell, cwd),
  writePty: (id, data) => ipcRenderer.send('pty:input', id, data),
  resizePty: (id, cols, rows) => ipcRenderer.send('pty:resize', id, cols, rows),
  killPty: (id) => ipcRenderer.send('pty:kill', id),
  onPtyOutput: (callback) => ipcRenderer.on('pty:output', (event, id, data) => callback(id, data)),
  onPtyExit: (callback) => ipcRenderer.on('pty:exit', (event, id, code) => callback(id, code)),
};

contextBridge.exposeInMainWorld('api', api);
```

**Step 2: Commit**

```bash
git add src/preload.ts
git commit -m "feat: add preload script with context bridge"
```

---

## 任务 10: 创建 package.json 和基础配置

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `electron.vite.config.ts`

**Step 1: 创建 package.json**

```json
{
  "name": "nexterm",
  "version": "0.2.0",
  "description": "AI Native Windows Terminal",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package": "electron-builder"
  },
  "dependencies": {
    "@xterm/xterm": "^5.3.0",
    "@xterm/addon-fit": "^0.8.0",
    "@xterm/addon-web-links": "^0.9.0",
    "electron-store": "^8.1.0",
    "keytar": "^7.9.0",
    "node-pty": "^1.0.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.9.0",
    "electron-vite": "^2.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  },
  "build": {
    "appId": "com.nexterm.app",
    "productName": "NexTerm",
    "directories": {
      "output": "release"
    },
    "win": {
      "target": "nsis"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

**Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "release"]
}
```

**Step 3: Commit**

```bash
git add package.json tsconfig.json electron.vite.config.ts
git commit -m "chore: add project configuration files"
```

---

**计划完成。文件已保存到 `docs/plans/2026-03-27-nexterm-ai-provider-implementation-plan.md`**

**两个执行选项：**

**1. Subagent-Driven (本会话)** - 每个任务派发新的 subagent，任务间进行 review，快速迭代

**2. Parallel Session (独立会话)** - 在 worktree 中打开新会话，使用 executing-plans 批量执行并设置检查点

选择哪种方式？