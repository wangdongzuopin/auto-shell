"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const pty = require("node-pty");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const os__namespace = /* @__PURE__ */ _interopNamespaceDefault(os);
const pty__namespace = /* @__PURE__ */ _interopNamespaceDefault(pty);
const PROMPTS = {
  explainError: (ctx) => `
你是一个 Windows 终端助手。用户在 ${ctx.shell} 中执行命令后报错了。
命令: ${ctx.command}
退出码: ${ctx.exitCode}
当前目录: ${ctx.cwd}
标准错误输出:
${ctx.stderr.slice(-1200)}

请用中文严格返回 JSON：
{
  "reason": "一句话解释错误原因",
  "fixes": [
    { "description": "修复建议", "command": "具体命令" }
  ]
}
只输出 JSON，不要附加说明。
`,
  naturalToCommand: (input, shell) => `
请把下面这句自然语言转换成可直接执行的 ${shell} 命令。
只输出命令本身，不要解释。

描述: ${input}
`,
  explainCommand: (command) => `
请用中文解释下面的终端命令，并严格返回 JSON：
{
  "summary": "一句话说明命令作用",
  "parts": [
    { "token": "命令或参数", "meaning": "含义" }
  ]
}

命令: ${command}
只输出 JSON。
`
};
class ClaudeProvider {
  constructor(config) {
    this.config = config;
  }
  name = "Claude";
  get baseUrl() {
    return this.config.baseUrl ?? "https://api.anthropic.com";
  }
  get model() {
    return this.config.model ?? "claude-3-7-sonnet-latest";
  }
  async isAvailable() {
    if (!this.config.apiKey) return false;
    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 8,
          messages: [{ role: "user", content: "ping" }]
        }),
        signal: AbortSignal.timeout(5e3)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  async chat(messages) {
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
  async streamChat(messages, onChunk) {
    const body = buildClaudeRequestBody(messages, this.model, true);
    console.info(`[AI:${this.name}] stream request`, {
      baseUrl: this.baseUrl,
      model: this.model,
      messageCount: body.messages.length,
      hasSystemPrompt: Boolean(body.system)
    });
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const text = await response.text();
      console.error(`[AI:${this.name}] stream request failed`, {
        status: response.status,
        bodyPreview: text.slice(0, 400)
      });
      throw new Error(`${this.name} 请求失败: ${response.status} ${text}`);
    }
    let output = "";
    await readSseStream$1(response, (payload) => {
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
  async explainError(ctx) {
    return this.chat([{ role: "user", content: PROMPTS.explainError(ctx) }]);
  }
  async naturalToCommand(input, shell) {
    return this.chat([{ role: "user", content: PROMPTS.naturalToCommand(input, shell) }]);
  }
  async explainCommand(command) {
    const response = await this.chat([{ role: "user", content: PROMPTS.explainCommand(command) }]);
    return JSON.parse(response);
  }
  async suggestCompletion(_ctx) {
    return [];
  }
  async requestMessage(messages, stream) {
    const requestBody = buildClaudeRequestBody(messages, this.model, stream);
    console.info(`[AI:${this.name}] request`, {
      baseUrl: this.baseUrl,
      model: this.model,
      messageCount: requestBody.messages.length,
      hasSystemPrompt: Boolean(requestBody.system),
      stream
    });
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(requestBody)
    });
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
function buildClaudeRequestBody(messages, model, stream) {
  const system = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
  const normalizedMessages = messages.filter((message) => message.role !== "system").map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content
  }));
  return {
    model,
    max_tokens: 4096,
    system: system || void 0,
    messages: normalizedMessages,
    stream
  };
}
function extractClaudeText(data) {
  if (!Array.isArray(data?.content)) {
    return "";
  }
  return data.content.filter((block) => block?.type === "text" && typeof block?.text === "string").map((block) => block.text).join("\n").trim();
}
function extractClaudeStreamChunk(payload) {
  if (payload?.type === "content_block_delta" && typeof payload?.delta?.text === "string") {
    return payload.delta.text;
  }
  return "";
}
async function readSseStream$1(response, onPayload) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("模型响应不支持流式读取。");
  }
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const segments = buffer.split("\n\n");
    buffer = segments.pop() ?? "";
    for (const segment of segments) {
      const lines = segment.split("\n").map((line) => line.trim()).filter(Boolean);
      const dataLines = lines.filter((line) => line.startsWith("data:"));
      if (dataLines.length === 0) {
        continue;
      }
      const payloadText = dataLines.map((line) => line.slice(5).trim()).join("\n");
      if (!payloadText || payloadText === "[DONE]") {
        continue;
      }
      onPayload(JSON.parse(payloadText));
    }
  }
}
class OllamaProvider {
  constructor(config = {}) {
    this.config = config;
  }
  name = "Ollama";
  get baseUrl() {
    return this.config.baseUrl ?? "http://localhost:11434";
  }
  get model() {
    return this.config.model ?? "qwen2.5:7b";
  }
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2e3)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  async chat(messages) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        messages
      })
    });
    if (!response.ok) {
      const text2 = await response.text();
      throw new Error(`Ollama 请求失败: ${response.status} ${text2}`);
    }
    const data = await response.json();
    const text = data.message?.content?.trim?.() ?? "";
    if (!text) {
      throw new Error("Ollama 已调用成功，但返回内容为空。");
    }
    return text;
  }
  async streamChat(messages, onChunk) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
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
      throw new Error("Ollama 响应不支持流式读取。");
    }
    const decoder = new TextDecoder();
    let buffer = "";
    let output = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        const payload = JSON.parse(trimmed);
        const chunk = payload?.message?.content ?? "";
        if (chunk) {
          output += chunk;
          onChunk(chunk);
        }
      }
    }
    if (!output.trim()) {
      throw new Error("Ollama 已调用成功，但流式内容为空。");
    }
    return output.trim();
  }
  async explainError(ctx) {
    return this.chat([{ role: "user", content: PROMPTS.explainError(ctx) }]);
  }
  async naturalToCommand(input, shell) {
    return this.chat([{ role: "user", content: PROMPTS.naturalToCommand(input, shell) }]);
  }
  async explainCommand(command) {
    const response = await this.chat([{ role: "user", content: PROMPTS.explainCommand(command) }]);
    return JSON.parse(response);
  }
  async suggestCompletion(_ctx) {
    return [];
  }
}
class OpenAIProvider {
  constructor(config) {
    this.config = config;
    this.name = config.name ?? "OpenAI Compatible";
  }
  name;
  get baseUrl() {
    return this.config.baseUrl ?? "https://api.openai.com/v1";
  }
  get model() {
    return this.config.model ?? "gpt-4o-mini";
  }
  async isAvailable() {
    if (!this.config.apiKey) return false;
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`
        },
        signal: AbortSignal.timeout(5e3)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  async chat(messages) {
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
  async streamChat(messages, onChunk) {
    console.info(`[AI:${this.name}] stream request`, {
      baseUrl: this.baseUrl,
      model: this.model,
      messageCount: messages.length
    });
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
    let output = "";
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
  async explainError(ctx) {
    return this.chat([{ role: "user", content: PROMPTS.explainError(ctx) }]);
  }
  async naturalToCommand(input, shell) {
    return this.chat([{ role: "user", content: PROMPTS.naturalToCommand(input, shell) }]);
  }
  async explainCommand(command) {
    const response = await this.chat([{ role: "user", content: PROMPTS.explainCommand(command) }]);
    return JSON.parse(response);
  }
  async suggestCompletion(_ctx) {
    return [];
  }
  async requestChat(messages, stream) {
    console.info(`[AI:${this.name}] request`, {
      baseUrl: this.baseUrl,
      model: this.model,
      messageCount: messages.length,
      stream
    });
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
function extractOpenAIText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content.filter((item) => item?.type === "text" && typeof item?.text === "string").map((item) => item.text).join("\n").trim();
  }
  return "";
}
function extractOpenAIStreamChunk(payload) {
  const delta = payload?.choices?.[0]?.delta?.content;
  if (typeof delta === "string") {
    return delta;
  }
  if (Array.isArray(delta)) {
    return delta.filter((item) => item?.type === "text" && typeof item?.text === "string").map((item) => item.text).join("");
  }
  return "";
}
async function readSseStream(response, onPayload) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("模型响应不支持流式读取。");
  }
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const segments = buffer.split("\n\n");
    buffer = segments.pop() ?? "";
    for (const segment of segments) {
      const lines = segment.split("\n").map((line) => line.trim()).filter(Boolean);
      const dataLines = lines.filter((line) => line.startsWith("data:"));
      if (dataLines.length === 0) {
        continue;
      }
      const payloadText = dataLines.map((line) => line.slice(5).trim()).join("\n");
      if (!payloadText || payloadText === "[DONE]") {
        continue;
      }
      onPayload(JSON.parse(payloadText));
    }
  }
}
function createProvider(config) {
  switch (config.type) {
    case "minimax":
      return new ClaudeProvider({
        apiKey: config.apiKey ?? "",
        baseUrl: config.baseUrl ?? "https://api.minimaxi.com/anthropic",
        model: config.model ?? "MiniMax-M2.7"
      });
    case "glm":
      return new OpenAIProvider({
        name: "GLM",
        apiKey: config.apiKey ?? "",
        baseUrl: config.baseUrl ?? "https://open.bigmodel.cn/api/paas/v4",
        model: config.model ?? "glm-4.5"
      });
    case "claude":
      return new ClaudeProvider({
        apiKey: config.apiKey ?? "",
        baseUrl: config.baseUrl ?? "https://api.anthropic.com",
        model: config.model ?? "claude-3-7-sonnet-latest"
      });
    case "openai":
      return new OpenAIProvider({
        name: "OpenAI",
        apiKey: config.apiKey ?? "",
        baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
        model: config.model ?? "gpt-4o-mini"
      });
    case "openaiCompatible":
      return new OpenAIProvider({
        name: "OpenAI Compatible",
        apiKey: config.apiKey ?? "",
        baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
        model: config.model ?? "gpt-4o-mini"
      });
    case "ollama":
      return new OllamaProvider({
        baseUrl: config.baseUrl ?? "http://localhost:11434",
        model: config.model ?? "qwen2.5:7b"
      });
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}
const IPC = {
  // AI
  AI_CHAT: "ai:chat",
  AI_CHAT_STREAM_START: "ai:chat-stream:start",
  AI_CHAT_STREAM_CHUNK: "ai:chat-stream:chunk",
  AI_CHAT_STREAM_DONE: "ai:chat-stream:done",
  AI_CHAT_STREAM_ERROR: "ai:chat-stream:error",
  AI_EXPLAIN_ERROR: "ai:explain-error",
  AI_NATURAL_CMD: "ai:natural-cmd",
  AI_EXPLAIN_CMD: "ai:explain-cmd",
  AI_COMPLETION: "ai:completion",
  AI_CHECK_AVAILABLE: "ai:check-available",
  // Config
  CONFIG_GET: "config:get",
  CONFIG_SET_PROVIDER: "config:set-provider",
  CONFIG_SET_PROVIDER_CONFIG: "config:set-provider-config",
  CONFIG_SET_THEME: "config:set-theme",
  CONFIG_SET_FEATURES: "config:set-features",
  KEY_SAVE: "key:save",
  KEY_GET: "key:get",
  // Window controls
  WINDOW_MINIMIZE: "window:minimize",
  WINDOW_MAXIMIZE: "window:maximize",
  WINDOW_CLOSE: "window:close"
};
const CONFIG_DIR = path__namespace.join(os__namespace.homedir(), ".autoshell");
const CONFIG_PATH = path__namespace.join(CONFIG_DIR, "config.json");
const defaultProviderConfigs = {
  minimax: {
    baseUrl: "https://api.minimaxi.com/anthropic",
    model: "MiniMax-M2.7"
  },
  glm: {
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4.5"
  },
  claude: {
    baseUrl: "https://api.anthropic.com",
    model: "claude-3-7-sonnet-latest"
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini"
  },
  ollama: {
    baseUrl: "http://localhost:11434",
    model: "qwen2.5:7b"
  },
  openaiCompatible: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini"
  }
};
const defaultTheme = {
  name: "Auto Shell Dark",
  background: "#0f1115",
  foreground: "#d8dee9",
  accent: "#4c8dff"
};
const defaultFeatures = {
  errorCard: true,
  naturalCommand: true,
  explainCommand: true,
  completion: false
};
const defaultConfig = {
  provider: "minimax",
  providerConfigs: defaultProviderConfigs,
  aiFeatures: defaultFeatures,
  theme: defaultTheme,
  apiKeys: {}
};
function normalizeProviderConfig(provider, config) {
  if (provider === "minimax" && config.baseUrl === "https://api.minimaxi.com/v1") {
    return {
      ...config,
      baseUrl: "https://api.minimaxi.com/anthropic"
    };
  }
  return config;
}
function ensureConfigDir() {
  fs__namespace.mkdirSync(CONFIG_DIR, { recursive: true });
}
function normalizePersistedConfig(input) {
  const providerConfigs = {
    ...defaultProviderConfigs,
    ...input?.providerConfigs ?? {}
  };
  const normalizedProviderConfigs = Object.fromEntries(
    Object.entries(providerConfigs).map(([providerName, providerConfig]) => [
      providerName,
      normalizeProviderConfig(providerName, providerConfig)
    ])
  );
  return {
    provider: input?.provider ?? defaultConfig.provider,
    providerConfigs: normalizedProviderConfigs,
    aiFeatures: {
      ...defaultFeatures,
      ...input?.aiFeatures ?? {}
    },
    theme: {
      ...defaultTheme,
      ...input?.theme ?? {}
    },
    apiKeys: input?.apiKeys ?? {}
  };
}
function writePersistedConfig(config) {
  ensureConfigDir();
  fs__namespace.writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}
`, "utf8");
}
function readPersistedConfig() {
  ensureConfigDir();
  if (!fs__namespace.existsSync(CONFIG_PATH)) {
    writePersistedConfig(defaultConfig);
    return defaultConfig;
  }
  try {
    const raw = fs__namespace.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const normalized = normalizePersistedConfig(parsed);
    writePersistedConfig(normalized);
    return normalized;
  } catch (error) {
    console.error("Failed to read Auto Shell config, resetting:", error);
    writePersistedConfig(defaultConfig);
    return defaultConfig;
  }
}
function updatePersistedConfig(updater) {
  const nextConfig = normalizePersistedConfig(updater(readPersistedConfig()));
  writePersistedConfig(nextConfig);
  return nextConfig;
}
async function saveApiKey(provider, key) {
  updatePersistedConfig((current) => ({
    ...current,
    apiKeys: {
      ...current.apiKeys,
      [provider]: key
    }
  }));
}
async function getApiKey(provider) {
  return readPersistedConfig().apiKeys[provider] ?? null;
}
function getConfig() {
  const persisted = readPersistedConfig();
  return {
    provider: persisted.provider,
    providerConfig: persisted.providerConfigs[persisted.provider],
    providerConfigs: persisted.providerConfigs,
    aiFeatures: persisted.aiFeatures,
    theme: persisted.theme
  };
}
function setProvider(provider) {
  updatePersistedConfig((current) => ({
    ...current,
    provider
  }));
}
function setProviderConfig(provider, config) {
  updatePersistedConfig((current) => ({
    ...current,
    providerConfigs: {
      ...current.providerConfigs,
      [provider]: normalizeProviderConfig(provider, config)
    }
  }));
}
function setTheme(theme) {
  updatePersistedConfig((current) => ({
    ...current,
    theme
  }));
}
function setFeatures(features) {
  updatePersistedConfig((current) => ({
    ...current,
    aiFeatures: features
  }));
}
let currentProvider = null;
async function getProvider() {
  if (currentProvider) return currentProvider;
  const config = getConfig();
  const apiKey = await getApiKey(config.provider);
  currentProvider = createProvider({
    type: config.provider,
    apiKey: apiKey ?? void 0,
    ...config.providerConfig
  });
  return currentProvider;
}
function invalidateProvider() {
  currentProvider = null;
}
function registerIpcHandlers() {
  electron.ipcMain.handle(IPC.AI_CHECK_AVAILABLE, async () => {
    const provider = await getProvider();
    return provider.isAvailable();
  });
  electron.ipcMain.handle(IPC.AI_CHAT, async (_event, messages) => {
    const provider = await getProvider();
    return provider.chat(messages);
  });
  electron.ipcMain.on(IPC.AI_CHAT_STREAM_START, async (event, requestId, messages) => {
    try {
      const provider = await getProvider();
      await provider.streamChat(messages, (chunk) => {
        event.sender.send(IPC.AI_CHAT_STREAM_CHUNK, requestId, chunk);
      });
      event.sender.send(IPC.AI_CHAT_STREAM_DONE, requestId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 流式对话失败";
      event.sender.send(IPC.AI_CHAT_STREAM_ERROR, requestId, message);
    }
  });
  electron.ipcMain.handle(IPC.AI_EXPLAIN_ERROR, async (_event, ctx) => {
    const provider = await getProvider();
    return provider.explainError(ctx);
  });
  electron.ipcMain.handle(IPC.AI_NATURAL_CMD, async (_event, input, shell) => {
    const provider = await getProvider();
    return provider.naturalToCommand(input, shell);
  });
  electron.ipcMain.handle(IPC.AI_EXPLAIN_CMD, async (_event, command) => {
    const provider = await getProvider();
    return provider.explainCommand(command);
  });
  electron.ipcMain.handle(IPC.CONFIG_GET, () => getConfig());
  electron.ipcMain.handle(IPC.CONFIG_SET_PROVIDER, (_event, provider) => {
    setProvider(provider);
    invalidateProvider();
    return true;
  });
  electron.ipcMain.handle(
    IPC.CONFIG_SET_PROVIDER_CONFIG,
    (_event, provider, config) => {
      setProviderConfig(provider, config);
      if (provider === getConfig().provider) {
        invalidateProvider();
      }
      return true;
    }
  );
  electron.ipcMain.handle(IPC.CONFIG_SET_THEME, (_event, theme) => {
    setTheme(theme);
    return true;
  });
  electron.ipcMain.handle(IPC.CONFIG_SET_FEATURES, (_event, features) => {
    setFeatures(features);
    return true;
  });
  electron.ipcMain.handle(IPC.KEY_GET, async (_event, provider) => getApiKey(provider));
  electron.ipcMain.handle(IPC.KEY_SAVE, async (_event, provider, key) => {
    await saveApiKey(provider, key);
    if (provider === getConfig().provider) {
      invalidateProvider();
    }
    return true;
  });
}
const instances = /* @__PURE__ */ new Map();
function resolveCwd(cwd) {
  if (!cwd || cwd === "~") {
    return os__namespace.homedir();
  }
  if (cwd.startsWith("~")) {
    return cwd.replace("~", os__namespace.homedir());
  }
  return cwd;
}
function registerPtyHandlers() {
  electron.ipcMain.handle("pty:create", async (event, id, shell, cwd) => {
    const existing = instances.get(id);
    if (existing) {
      existing.pty.kill();
      instances.delete(id);
    }
    const { file, args } = getShellLaunchConfig(shell);
    const ptyProcess = pty__namespace.spawn(file, args, {
      cwd: resolveCwd(cwd),
      cols: 80,
      rows: 24,
      name: "xterm-256color"
    });
    ptyProcess.onData((data) => {
      event.sender.send("pty:output", id, data);
    });
    ptyProcess.onExit(({ exitCode }) => {
      event.sender.send("pty:exit", id, exitCode);
      instances.delete(id);
    });
    instances.set(id, { id, pty: ptyProcess });
    return id;
  });
  electron.ipcMain.on("pty:input", (_event, id, data) => {
    instances.get(id)?.pty.write(data);
  });
  electron.ipcMain.on("pty:resize", (_event, id, cols, rows) => {
    instances.get(id)?.pty.resize(cols, rows);
  });
  electron.ipcMain.on("pty:kill", (_event, id) => {
    const instance = instances.get(id);
    if (!instance) {
      return;
    }
    instance.pty.kill();
    instances.delete(id);
  });
}
function getShellLaunchConfig(shell) {
  switch (shell) {
    case "powershell":
      return {
        file: "powershell.exe",
        args: [
          "-NoLogo",
          "-NoExit",
          "-Command",
          "[Console]::InputEncoding=[System.Text.UTF8Encoding]::new(); [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); chcp 65001 > $null"
        ]
      };
    case "cmd":
      return {
        file: "cmd.exe",
        args: ["/k", "chcp", "65001"]
      };
    case "wsl":
      return {
        file: "wsl.exe",
        args: []
      };
    case "git-bash":
      return {
        file: "bash.exe",
        args: ["--login"]
      };
    default:
      return {
        file: "powershell.exe",
        args: [
          "-NoLogo",
          "-NoExit",
          "-Command",
          "[Console]::InputEncoding=[System.Text.UTF8Encoding]::new(); [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); chcp 65001 > $null"
        ]
      };
  }
}
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#0e0f11",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path__namespace.join(__dirname, "../preload/index.js")
    },
    show: false,
    frame: false
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path__namespace.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
electron.app.whenReady().then(() => {
  registerIpcHandlers();
  registerPtyHandlers();
  createWindow();
  electron.ipcMain.on(IPC.WINDOW_MINIMIZE, () => mainWindow?.minimize());
  electron.ipcMain.on(IPC.WINDOW_MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  electron.ipcMain.on(IPC.WINDOW_CLOSE, () => mainWindow?.close());
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
