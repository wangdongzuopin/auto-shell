"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const child_process = require("child_process");
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
你是一个终端助手。用户在 ${ctx.shell} 中执行命令后报错了。
命令: ${ctx.command}
退出码: ${ctx.exitCode}
当前目录: ${ctx.cwd}
标准错误输出:
${ctx.stderr.slice(-1200)}

请用中文严格返回 JSON：{
  "reason": "一句话解释错误原因",
  "fixes": [
    { "description": "修复建议", "command": "具体命令" }
  ]
}
只输出 JSON，不要附加说明。`,
  naturalToCommand: (input, shell) => `
请把下面这句自然语言转换成可直接执行的 ${shell} 命令。只输出命令本身，不要解释。
描述: ${input}
`,
  explainCommand: (command) => `
请用中文解释下面的终端命令，并严格返回 JSON：{
  "summary": "一句话说明命令作用",
  "parts": [
    { "token": "命令或参数", "meaning": "含义" }
  ]
}

命令: ${command}
只输出 JSON。`
};
function buildSystemPrompt(skills) {
  const enabledSkills = skills.filter((s) => s.enabled);
  let prompt = `你是一个AI助手，叫Auto Shell。

## 你的能力
- 可以读取、创建和编辑文件
- 可以执行终端命令
- 可以搜索文件和内容
- 可以使用各种技能来帮助你完成任务
- 可以打开网页链接

`;
  if (enabledSkills.length > 0) {
    prompt += `## 可用技能
`;
    for (const skill of enabledSkills) {
      prompt += `- ${skill.name}: ${skill.description}
`;
    }
    prompt += `
`;
  }
  prompt += `## 使用工具
当用户要求读取文件时，使用 Read 工具。
当用户要求创建或修改文件时，使用 Write 工具。
当用户要求执行命令时，使用 Bash 工具。
当用户要求搜索文件时，使用 Glob 工具。
当用户要求搜索文件内容时，使用 Grep 工具。
当用户要求打开网页或浏览器时，使用 open_browser 工具，格式：[TOOL: open_browser: URL]

`;
  prompt += `## 规则
1. 如果你不确定文件是否存在，先尝试读取
2. 执行危险命令前先确认
3. 始终用中文回复
4. 如果工具执行失败，告诉用户错误信息
5. 当需要打开网页时，先提取或确认URL，然后使用 [TOOL: open_browser: URL] 格式调用工具

`;
  return prompt;
}
buildSystemPrompt([]);
function formatFetchFailureError(err) {
  if (!(err instanceof Error)) {
    return String(err);
  }
  const base = err.message;
  const cause = err.cause;
  let detail = "";
  if (cause instanceof Error) {
    const ne = cause;
    if (ne.message) {
      detail = ` — ${ne.message}`;
    }
    const code = ne.code;
    if (code === "ECONNREFUSED") {
      detail += "（连接被拒绝：若使用 Ollama 请先启动本机服务；第三方 API 请核对 Base URL 与端口。）";
    } else if (code === "ENOTFOUND") {
      detail += "（域名无法解析：请检查 Base URL 与当前网络/DNS。）";
    } else if (code === "CERT_HAS_EXPIRED" || code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
      detail += "（TLS/证书异常：可检查系统时间、公司代理或网关证书。）";
    } else if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") {
      detail += "（连接超时：请检查网络、防火墙或代理。）";
    }
  }
  const isGenericFetch = /^fetch failed$/i.test(base.trim());
  if (isGenericFetch) {
    return `无法连接到接口${detail || "，请检查网络与 Base URL"}`;
  }
  return `${base}${detail}`;
}
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
    } catch (e) {
      console.warn(`[AI:${this.name}] isAvailable fetch failed`, formatFetchFailureError(e));
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
    let response;
    try {
      response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01"
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
    let response;
    try {
      response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01"
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
    } catch (e) {
      console.warn("[AI:Ollama] isAvailable fetch failed", formatFetchFailureError(e));
      return false;
    }
  }
  async chat(messages) {
    let response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
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
    } catch (e) {
      throw new Error(`Ollama ${formatFetchFailureError(e)}`);
    }
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
    let response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
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
    } catch (e) {
      throw new Error(`Ollama ${formatFetchFailureError(e)}`);
    }
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
function normalizeOpenAiCompatBaseUrl(raw) {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "https://api.openai.com/v1";
  }
  try {
    const parsed = new URL(trimmed);
    const path2 = parsed.pathname.replace(/\/+$/, "") || "";
    if (path2 === "") {
      return `${parsed.origin}/v1`;
    }
    return `${parsed.origin}${path2}`;
  } catch {
    return trimmed;
  }
}
class OpenAIProvider {
  constructor(config) {
    this.config = config;
    this.name = config.name ?? "OpenAI Compatible";
  }
  name;
  get baseUrl() {
    return normalizeOpenAiCompatBaseUrl(this.config.baseUrl ?? "https://api.openai.com/v1");
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
    } catch (e) {
      console.warn(`[AI:${this.name}] isAvailable fetch failed`, formatFetchFailureError(e));
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
    let response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
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
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const raw = await response.text();
      let data;
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
    let output = "";
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
    let response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
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
function formatOpenAIErrorPayload(data) {
  if (!data || typeof data !== "object") {
    return null;
  }
  const err = data.error;
  if (err == null) {
    return null;
  }
  if (typeof err === "string") {
    return err;
  }
  if (typeof err === "object" && err !== null && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
async function readSseStream(providerName, response, onPayload) {
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
    buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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
class MiniMaxProvider extends OpenAIProvider {
  constructor(config) {
    super({
      ...config,
      name: "MiniMax"
    });
  }
}
const MODEL_PRESETS = {
  "claude-3-5-sonnet": {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    brand: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    apiPath: "/v1/messages",
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096
  },
  "claude-3-haiku": {
    id: "claude-3-haiku",
    name: "Claude 3 Haiku",
    brand: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    apiPath: "/v1/messages",
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    brand: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiPath: "/v1/chat/completions",
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    brand: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiPath: "/v1/chat/completions",
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096
  },
  "MiniMax-M2.7": {
    id: "MiniMax-M2.7",
    name: "MiniMax M2.7",
    brand: "MiniMax",
    baseUrl: "https://api.minimaxi.com/v1",
    apiPath: "/chat/completions",
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096
  },
  "glm-4": {
    id: "glm-4",
    name: "GLM-4",
    brand: "Zhipu",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiPath: "/chat/completions",
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096
  },
  "llama3": {
    id: "llama3",
    name: "Llama 3",
    brand: "Ollama",
    baseUrl: "http://localhost:11434",
    apiPath: "/api/chat",
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096
  }
};
function createProvider(config) {
  let finalConfig = config;
  if (config.model && MODEL_PRESETS[config.model]) {
    const preset = MODEL_PRESETS[config.model];
    const brandToType = {
      "Anthropic": "claude",
      "OpenAI": "openai",
      "MiniMax": "minimax",
      "Zhipu": "glm",
      "Ollama": "ollama"
    };
    finalConfig = {
      ...config,
      type: config.type || brandToType[preset.brand] || config.type,
      baseUrl: config.baseUrl || preset.baseUrl,
      model: preset.id
    };
  }
  switch (finalConfig.type) {
    case "minimax":
      return new MiniMaxProvider({
        apiKey: finalConfig.apiKey ?? "",
        baseUrl: finalConfig.baseUrl ?? "https://api.minimaxi.com/v1",
        model: finalConfig.model ?? "MiniMax-M2.7"
      });
    case "glm":
      return new OpenAIProvider({
        name: "GLM",
        apiKey: finalConfig.apiKey ?? "",
        baseUrl: finalConfig.baseUrl ?? "https://open.bigmodel.cn/api/paas/v4",
        model: finalConfig.model ?? "glm-4.5"
      });
    case "claude":
      return new ClaudeProvider({
        apiKey: finalConfig.apiKey ?? "",
        baseUrl: finalConfig.baseUrl ?? "https://api.anthropic.com",
        model: finalConfig.model ?? "claude-3-7-sonnet-latest"
      });
    case "openai":
      return new OpenAIProvider({
        name: "OpenAI",
        apiKey: finalConfig.apiKey ?? "",
        baseUrl: finalConfig.baseUrl ?? "https://api.openai.com/v1",
        model: finalConfig.model ?? "gpt-4o-mini"
      });
    case "openaiCompatible":
      return new OpenAIProvider({
        name: "OpenAI Compatible",
        apiKey: finalConfig.apiKey ?? "",
        baseUrl: finalConfig.baseUrl ?? "https://api.openai.com/v1",
        model: finalConfig.model ?? "gpt-4o-mini"
      });
    case "ollama":
      return new OllamaProvider({
        baseUrl: finalConfig.baseUrl ?? "http://localhost:11434",
        model: finalConfig.model ?? "qwen2.5:7b"
      });
    default:
      throw new Error(`Unknown provider type: ${finalConfig.type}`);
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
  CONFIG_GET_APPEARANCE: "config:get-appearance",
  CONFIG_SET_APPEARANCE: "config:set-appearance",
  KEY_SAVE: "key:save",
  KEY_GET: "key:get",
  PATH_EXISTS: "path:exists",
  PATH_RESOLVE_PROJECT: "path:resolve-project",
  PATH_FIND_PROJECT_CANDIDATES: "path:find-project-candidates",
  TERMINAL_SESSION_GET: "terminal-session:get",
  TERMINAL_SESSION_SAVE: "terminal-session:save",
  TERMINAL_HISTORY_RECORD: "terminal-history:record",
  // PTY command events
  PTY_COMMAND: "pty:command",
  // Window controls
  WINDOW_MINIMIZE: "window:minimize",
  WINDOW_MAXIMIZE: "window:maximize",
  WINDOW_CLOSE: "window:close",
  // Dialog
  DIALOG_OPEN_FOLDER: "dialog:open-folder",
  // Skills
  SKILLS_GET_ALL: "skills:get-all",
  SKILLS_GET_BY_PATH: "skills:get-by-path",
  // Sessions
  SESSION_SAVE: "session:save",
  SESSION_LOAD: "session:load",
  SESSION_LIST: "session:list",
  SESSION_DELETE: "session:delete",
  SESSION_LIST_ALL: "session:list-all",
  // Tools
  TOOL_READ: "tool:read",
  TOOL_WRITE: "tool:write",
  TOOL_GLOB: "tool:glob",
  TOOL_GREP: "tool:grep",
  TOOL_BASH: "tool:bash",
  TOOL_OPEN_URL: "tool:open-url",
  // MCP
  MCP_GET_SERVERS: "mcp:get-servers",
  MCP_GET_TOOLS: "mcp:get-tools",
  MCP_CALL_TOOL: "mcp:call-tool",
  MCP_DISCONNECT: "mcp:disconnect"
};
const CONFIG_DIR = path__namespace.join(os__namespace.homedir(), ".autoshell");
const CONFIG_PATH = path__namespace.join(CONFIG_DIR, "config.json");
const MAX_HISTORY_PER_DIRECTORY = 20;
const defaultProviderConfigs = {
  minimax: {
    baseUrl: "https://api.minimaxi.com/v1",
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
  apiKeys: {},
  currentModel: "MiniMax-M2.7",
  modelConfig: {},
  terminalSession: {
    tabs: [],
    activeTabId: null,
    commandHistoryByCwd: {}
  },
  appearance: {
    terminalTransparency: false,
    terminalOpacity: 0.7,
    terminalBackdrop: false
  }
};
function normalizeProviderConfig(provider, config) {
  if (provider === "minimax" && config.baseUrl === "https://api.minimaxi.com/anthropic") {
    return {
      ...config,
      baseUrl: "https://api.minimaxi.com/v1"
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
    apiKeys: input?.apiKeys ?? {},
    currentModel: input?.currentModel ?? defaultConfig.currentModel,
    modelConfig: input?.modelConfig ?? defaultConfig.modelConfig,
    terminalSession: normalizeTerminalSession(input?.terminalSession),
    appearance: {
      ...defaultConfig.appearance,
      ...input?.appearance ?? {}
    }
  };
}
function normalizeTerminalSession(input) {
  const tabs = Array.isArray(input?.tabs) ? input.tabs.map(normalizeTabSnapshot).filter((tab) => Boolean(tab)) : [];
  const activeTabId = typeof input?.activeTabId === "string" && tabs.some((tab) => tab.id === input.activeTabId) ? input.activeTabId : tabs[0]?.id ?? null;
  const commandHistoryByCwd = Object.fromEntries(
    Object.entries(input?.commandHistoryByCwd ?? {}).flatMap(([cwd, commands]) => {
      if (typeof cwd !== "string" || !cwd.trim() || !Array.isArray(commands)) {
        return [];
      }
      const normalizedCommands = commands.filter((command) => typeof command === "string").map((command) => command.trim()).filter(Boolean).slice(0, MAX_HISTORY_PER_DIRECTORY);
      return normalizedCommands.length > 0 ? [[cwd, normalizedCommands]] : [];
    })
  );
  return {
    tabs,
    activeTabId,
    commandHistoryByCwd
  };
}
function normalizeTabSnapshot(tab) {
  if (!tab || typeof tab !== "object") {
    return null;
  }
  const value = tab;
  if (!value.id || !value.name || !value.shell) {
    return null;
  }
  return {
    id: String(value.id),
    name: String(value.name),
    shell: String(value.shell),
    cwd: typeof value.cwd === "string" && value.cwd.trim() ? value.cwd : "~"
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
    theme: persisted.theme,
    currentModel: persisted.currentModel,
    modelConfig: persisted.modelConfig
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
function getTerminalSession() {
  return readPersistedConfig().terminalSession;
}
function saveTerminalSession(session) {
  updatePersistedConfig((current) => ({
    ...current,
    terminalSession: normalizeTerminalSession(session)
  }));
}
function getAppearance() {
  return readPersistedConfig().appearance;
}
function setAppearance(appearance) {
  updatePersistedConfig((current) => ({
    ...current,
    appearance
  }));
}
function recordTerminalCommand(cwd, command) {
  const normalizedCwd = normalizeCwdKey(cwd);
  const normalizedCommand = command.trim();
  if (!normalizedCommand) {
    return;
  }
  updatePersistedConfig((current) => {
    const existing = current.terminalSession.commandHistoryByCwd[normalizedCwd] ?? [];
    const nextHistory = [normalizedCommand, ...existing.filter((item) => item !== normalizedCommand)].slice(0, MAX_HISTORY_PER_DIRECTORY);
    return {
      ...current,
      terminalSession: {
        ...current.terminalSession,
        commandHistoryByCwd: {
          ...current.terminalSession.commandHistoryByCwd,
          [normalizedCwd]: nextHistory
        }
      }
    };
  });
}
function normalizeCwdKey(cwd) {
  return cwd?.trim() || "~";
}
const SESSIONS_DIR = path__namespace.join(os__namespace.homedir(), ".autoshell", "sessions");
function getSessionsDir() {
  if (!fs__namespace.existsSync(SESSIONS_DIR)) {
    fs__namespace.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
  return SESSIONS_DIR;
}
function saveSession(threadId, data) {
  const sessionsDir = getSessionsDir();
  const filePath = path__namespace.join(sessionsDir, `${threadId}.json`);
  fs__namespace.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}
function loadSession(threadId) {
  const filePath = path__namespace.join(getSessionsDir(), `${threadId}.json`);
  if (!fs__namespace.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs__namespace.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}
function listSessions() {
  const sessionsDir = getSessionsDir();
  if (!fs__namespace.existsSync(sessionsDir)) {
    return [];
  }
  return fs__namespace.readdirSync(sessionsDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));
}
function deleteSession(threadId) {
  const filePath = path__namespace.join(getSessionsDir(), `${threadId}.json`);
  if (fs__namespace.existsSync(filePath)) {
    fs__namespace.unlinkSync(filePath);
  }
}
function loadAllSessions() {
  const sessionsDir = getSessionsDir();
  if (!fs__namespace.existsSync(sessionsDir)) {
    return [];
  }
  const files = fs__namespace.readdirSync(sessionsDir).filter((f) => f.endsWith(".json"));
  const sessions = [];
  for (const file of files) {
    try {
      const content = fs__namespace.readFileSync(path__namespace.join(sessionsDir, file), "utf-8");
      sessions.push(JSON.parse(content));
    } catch {
    }
  }
  return sessions;
}
class MCPClientImpl {
  servers = /* @__PURE__ */ new Map();
  async connect(server) {
    if (this.servers.has(server.name)) {
      return this.servers.get(server.name).tools;
    }
    return new Promise((resolve, reject) => {
      const proc = child_process.spawn(server.command, server.args, {
        env: { ...process.env, ...server.env },
        stdio: ["pipe", "pipe", "pipe"],
        shell: false
      });
      const connectedServer = {
        process: proc,
        tools: [],
        requestId: 1
      };
      let stdoutBuffer = "";
      proc.stdout?.on("data", (data) => {
        stdoutBuffer += data.toString();
        const lines = stdoutBuffer.split("\n");
        stdoutBuffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            this.handleMessage(server.name, msg, connectedServer);
          } catch {
          }
        }
      });
      proc.stderr?.on("data", (data) => {
        console.error(`MCP ${server.name} stderr:`, data.toString());
      });
      proc.on("error", (err) => {
        console.error(`MCP ${server.name} error:`, err);
        this.servers.delete(server.name);
        reject(err);
      });
      proc.on("exit", (code) => {
        console.log(`MCP ${server.name} exited with code ${code}`);
        this.servers.delete(server.name);
      });
      this.servers.set(server.name, connectedServer);
      const initRequest = {
        jsonrpc: "2.0",
        id: 0,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "auto-shell",
            version: "1.0.0"
          }
        }
      };
      proc.stdin?.write(JSON.stringify(initRequest) + "\n");
      setTimeout(() => {
        proc.stdin?.write(JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized"
        }) + "\n");
      }, 100);
      setTimeout(() => {
        if (connectedServer.tools.length > 0) {
          resolve(connectedServer.tools);
        } else {
          resolve([]);
        }
      }, 2e3);
    });
  }
  handleMessage(serverName, msg, server) {
    if (msg.id !== void 0) {
      if (msg.result && typeof msg.result === "object" && "tools" in msg.result) {
        const result = msg.result;
        if (result.tools) {
          server.tools = result.tools;
        }
      }
    }
    if (msg.method === "tools/list") ;
  }
  async callTool(serverName, toolName, args) {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP server ${serverName} not connected`);
    }
    return new Promise((resolve, reject) => {
      const requestId = server.requestId++;
      const request = {
        jsonrpc: "2.0",
        id: requestId,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        }
      };
      const proc = server.process;
      let stdoutBuffer = "";
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`MCP tool ${toolName} timed out`));
      }, 3e4);
      const cleanup = () => {
        proc.stdout?.removeListener("data", onData);
      };
      const onData = (data) => {
        stdoutBuffer += data.toString();
        const lines = stdoutBuffer.split("\n");
        stdoutBuffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.id === requestId && msg.result) {
              clearTimeout(timeout);
              cleanup();
              resolve(msg.result);
            }
            if (msg.id === requestId && msg.error) {
              clearTimeout(timeout);
              cleanup();
              reject(new Error(msg.error.message || "Tool call failed"));
            }
          } catch {
          }
        }
      };
      proc.stdout?.on("data", onData);
      proc.stdin?.write(JSON.stringify(request) + "\n");
    });
  }
  disconnect(serverName) {
    const server = this.servers.get(serverName);
    if (server) {
      server.process.kill();
      this.servers.delete(serverName);
    }
  }
  getTools(serverName) {
    return this.servers.get(serverName)?.tools || [];
  }
  isConnected(serverName) {
    return this.servers.has(serverName);
  }
}
const mcpClient = new MCPClientImpl();
const MCP_CONFIG_DIR = path__namespace.join(os__namespace.homedir(), ".autoshell");
const MCP_CONFIG_PATH = path__namespace.join(MCP_CONFIG_DIR, "mcp-config.json");
function getMCPConfig() {
  if (!fs__namespace.existsSync(MCP_CONFIG_DIR)) {
    fs__namespace.mkdirSync(MCP_CONFIG_DIR, { recursive: true });
  }
  if (!fs__namespace.existsSync(MCP_CONFIG_PATH)) {
    return { servers: [] };
  }
  try {
    return JSON.parse(fs__namespace.readFileSync(MCP_CONFIG_PATH, "utf-8"));
  } catch {
    return { servers: [] };
  }
}
function getConnectedServers() {
  const config = getMCPConfig();
  return config.servers.filter((s) => mcpClient.isConnected(s.name)).map((s) => s.name);
}
function getServerTools(serverName) {
  return mcpClient.getTools(serverName);
}
async function callMCPTool(serverName, toolName, args) {
  return mcpClient.callTool(serverName, toolName, args);
}
function disconnectMCPServer(serverName) {
  mcpClient.disconnect(serverName);
}
let currentProvider = null;
async function getProvider() {
  if (currentProvider) {
    return currentProvider;
  }
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
  electron.ipcMain.handle(IPC.AI_NATURAL_CMD, async (_event, input, shell2) => {
    const provider = await getProvider();
    return provider.naturalToCommand(input, shell2);
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
  electron.ipcMain.handle(IPC.CONFIG_GET_APPEARANCE, () => getAppearance());
  electron.ipcMain.handle(IPC.CONFIG_SET_APPEARANCE, (_event, appearance) => {
    setAppearance(appearance);
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
  electron.ipcMain.handle(IPC.PATH_EXISTS, async (_event, targetPath) => {
    if (!targetPath) {
      return false;
    }
    return safeExists(targetPath);
  });
  electron.ipcMain.handle(IPC.PATH_RESOLVE_PROJECT, async (_event, input) => {
    return findProjectCandidates(input, 1)[0] ?? null;
  });
  electron.ipcMain.handle(IPC.PATH_FIND_PROJECT_CANDIDATES, async (_event, input) => {
    return findProjectCandidates(input, 5);
  });
  electron.ipcMain.handle(IPC.TERMINAL_SESSION_GET, () => getTerminalSession());
  electron.ipcMain.handle(IPC.TERMINAL_SESSION_SAVE, (_event, session) => {
    saveTerminalSession(session);
    return true;
  });
  electron.ipcMain.handle(IPC.TERMINAL_HISTORY_RECORD, (_event, cwd, command) => {
    recordTerminalCommand(cwd, command);
    return true;
  });
  electron.ipcMain.handle(IPC.DIALOG_OPEN_FOLDER, async (_event, title) => {
    const result = await electron.dialog.showOpenDialog({
      title,
      properties: ["openDirectory"]
    });
    return result.canceled ? null : result.filePaths[0];
  });
  electron.ipcMain.handle(IPC.SKILLS_GET_ALL, async () => {
    return loadSkillsFromDisk();
  });
  electron.ipcMain.handle(IPC.SKILLS_GET_BY_PATH, async (_event, skillPath) => {
    return loadSkillByPath(skillPath);
  });
  electron.ipcMain.handle(IPC.SESSION_SAVE, (_event, threadId, data) => {
    saveSession(threadId, data);
    return true;
  });
  electron.ipcMain.handle(IPC.SESSION_LOAD, (_event, threadId) => {
    return loadSession(threadId);
  });
  electron.ipcMain.handle(IPC.SESSION_LIST, () => {
    return listSessions();
  });
  electron.ipcMain.handle(IPC.SESSION_DELETE, (_event, threadId) => {
    deleteSession(threadId);
    return true;
  });
  electron.ipcMain.handle(IPC.SESSION_LIST_ALL, () => {
    return loadAllSessions();
  });
  electron.ipcMain.handle(IPC.TOOL_READ, async (_event, filePath) => {
    try {
      const content = fs__namespace.readFileSync(filePath, "utf-8");
      return { success: true, content };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: message };
    }
  });
  electron.ipcMain.handle(IPC.TOOL_WRITE, async (_event, filePath, content) => {
    try {
      const dir = path__namespace.dirname(filePath);
      if (!fs__namespace.existsSync(dir)) {
        fs__namespace.mkdirSync(dir, { recursive: true });
      }
      fs__namespace.writeFileSync(filePath, content, "utf-8");
      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: message };
    }
  });
  electron.ipcMain.handle(IPC.TOOL_GLOB, async (_event, pattern, cwd) => {
    try {
      let matchPattern = function(filePath, pattern2) {
        const parts = pattern2.split("/");
        const fileParts = filePath.replace(/\\/g, "/").split("/");
        let fileIndex = 0;
        for (const part of parts) {
          if (part === "**") {
            if (fileIndex >= fileParts.length) return false;
            continue;
          }
          if (part === "*") {
            if (fileIndex >= fileParts.length || fileParts[fileIndex].includes("/")) return false;
            fileIndex++;
            continue;
          }
          if (part.includes("*")) {
            const regex = new RegExp("^" + part.replace(/\*/g, ".*") + "$");
            if (fileIndex >= fileParts.length || !regex.test(fileParts[fileIndex])) return false;
            fileIndex++;
            continue;
          }
          if (fileIndex >= fileParts.length || fileParts[fileIndex] !== part) return false;
          fileIndex++;
        }
        return fileIndex === fileParts.length || parts[parts.length - 1] === "**";
      }, walkDir = function(dir, depth = 0) {
        if (depth > 10) return;
        try {
          const entries = fs__namespace.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path__namespace.join(dir, entry.name);
            if (entry.isDirectory()) {
              walkDir(fullPath, depth + 1);
            } else if (entry.isFile()) {
              const relativePath = path__namespace.relative(normalizedCwd, fullPath).replace(/\\/g, "/");
              if (matchPattern(relativePath, pattern) || matchPattern(entry.name, pattern)) {
                results.push(fullPath);
              }
            }
          }
        } catch {
        }
      };
      const results = [];
      const normalizedCwd = cwd || process.cwd();
      walkDir(normalizedCwd);
      return { success: true, matches: results.slice(0, 100) };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: message };
    }
  });
  electron.ipcMain.handle(IPC.TOOL_GREP, async (_event, pattern, cwd, options) => {
    try {
      let walkDir = function(dir, depth = 0) {
        if (depth > 10) return;
        try {
          const entries = fs__namespace.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path__namespace.join(dir, entry.name);
            if (entry.isDirectory()) {
              if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
                walkDir(fullPath, depth + 1);
              }
            } else if (entry.isFile()) {
              if (options?.ext && options.ext.length > 0) {
                const ext = path__namespace.extname(entry.name).slice(1);
                if (!options.ext.includes(ext)) continue;
              }
              try {
                const content = fs__namespace.readFileSync(fullPath, "utf-8");
                const lines = content.split("\n");
                lines.forEach((line, index) => {
                  if (regex.test(line)) {
                    results.push({
                      file: fullPath,
                      line: index + 1,
                      content: line.trim()
                    });
                  }
                });
              } catch {
              }
            }
          }
        } catch {
        }
      };
      const results = [];
      const normalizedCwd = cwd || process.cwd();
      const regex = new RegExp(pattern, "i");
      walkDir(normalizedCwd);
      return { success: true, matches: results.slice(0, 100) };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: message };
    }
  });
  electron.ipcMain.handle(IPC.TOOL_BASH, async (_event, command, cwd) => {
    return new Promise((resolve) => {
      const pty2 = require("node-pty");
      const shell2 = process.platform === "win32" ? "powershell.exe" : "bash";
      const cwdArg = cwd || os__namespace.homedir();
      try {
        const p = pty2.spawn(shell2, [], {
          cwd: cwdArg,
          env: process.env
        });
        let output = "";
        let timeout;
        const cleanup = () => {
          clearTimeout(timeout);
          try {
            p.kill();
          } catch {
          }
        };
        timeout = setTimeout(() => {
          cleanup();
          resolve({ exitCode: -1, output: "Command timed out after 30 seconds" });
        }, 3e4);
        p.onData((data) => {
          output += data;
        });
        p.onExit(({ exitCode }) => {
          cleanup();
          resolve({ exitCode: exitCode || 0, output });
        });
        p.write(command + "\r");
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        resolve({ exitCode: -1, output: "", error: message });
      }
    });
  });
  electron.ipcMain.handle(IPC.TOOL_OPEN_URL, async (_event, url) => {
    try {
      if (!url || typeof url !== "string") {
        return { success: false, error: "Invalid URL" };
      }
      let targetUrl = url;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        targetUrl = "https://" + url;
      }
      let parsedUrl;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        return { success: false, error: `Invalid URL format: ${url}` };
      }
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return { success: false, error: `Invalid URL protocol: must use http:// or https://, got ${parsedUrl.protocol}` };
      }
      const { execFile } = require("child_process");
      const platform = process.platform;
      const execFilePromise = (file, args) => {
        return new Promise((resolve) => {
          execFile(file, args, { shell: true }, (error, _stdout, _stderr) => {
            resolve({ code: error ? 1 : 0 });
          });
        });
      };
      if (platform === "win32") {
        const { code } = await execFilePromise("rundll32", ["url,OpenURL", targetUrl]);
        return { success: code === 0 };
      } else if (platform === "darwin") {
        const { code } = await execFilePromise("open", [targetUrl]);
        return { success: code === 0 };
      } else {
        const { code } = await execFilePromise("xdg-open", [targetUrl]);
        return { success: code === 0 };
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: message };
    }
  });
  electron.ipcMain.handle(IPC.MCP_GET_SERVERS, () => {
    return getConnectedServers();
  });
  electron.ipcMain.handle(IPC.MCP_GET_TOOLS, (_event, serverName) => {
    return getServerTools(serverName);
  });
  electron.ipcMain.handle(IPC.MCP_CALL_TOOL, async (_event, serverName, toolName, args) => {
    try {
      const result = await callMCPTool(serverName, toolName, args);
      return { success: true, result };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: message };
    }
  });
  electron.ipcMain.handle(IPC.MCP_DISCONNECT, (_event, serverName) => {
    disconnectMCPServer(serverName);
    return true;
  });
}
function findProjectCandidates(input, limit) {
  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return [];
  }
  const explicitPath = normalizeExplicitPath(normalizedInput);
  if (explicitPath && safeExists(explicitPath)) {
    return [explicitPath];
  }
  const driveHint = extractDriveHint(normalizedInput);
  const tokens = extractProjectTokens(normalizedInput);
  if (tokens.length === 0) {
    return [];
  }
  const roots = getSearchRoots(driveHint);
  const matches = /* @__PURE__ */ new Map();
  for (const root of roots) {
    for (const candidate of resolveFromRoot(root, tokens, limit)) {
      const existing = matches.get(candidate.path);
      if (!existing || candidate.score > existing.score || candidate.depth < existing.depth) {
        matches.set(candidate.path, candidate);
      }
    }
  }
  return [...matches.values()].sort((a, b) => b.score - a.score || a.depth - b.depth || a.path.length - b.path.length).slice(0, limit).map((item) => item.path);
}
function normalizeExplicitPath(input) {
  const cleaned = input.replace(/[。！!？?]+$/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return null;
  }
  if (/^[a-zA-Z]:/.test(cleaned)) {
    return cleaned.replace(/\//g, "\\");
  }
  const driveChineseMatch = cleaned.match(/^([a-zA-Z])盘[:：]?[\\/]*(.*)$/i);
  if (driveChineseMatch) {
    const rest = driveChineseMatch[2].trim().replace(/[\\/]+/g, "\\");
    return rest ? `${driveChineseMatch[1].toUpperCase()}:\\${rest}` : `${driveChineseMatch[1].toUpperCase()}:\\`;
  }
  if (cleaned.startsWith("~") || cleaned.startsWith("/") || cleaned.startsWith("\\")) {
    return cleaned;
  }
  return null;
}
function extractDriveHint(input) {
  const directMatch = input.match(/([a-zA-Z]):/);
  if (directMatch) {
    return `${directMatch[1].toUpperCase()}:\\`;
  }
  const chineseMatch = input.match(/([a-zA-Z])盘/i);
  if (chineseMatch) {
    return `${chineseMatch[1].toUpperCase()}:\\`;
  }
  return null;
}
function extractProjectTokens(input) {
  const sanitized = input.replace(/[。！!？?]+$/g, " ").replace(/([a-zA-Z])盘/gi, " ").replace(/[\\/]+/g, " ").replace(/[:：]/g, " ").replace(/\b(cd|chdir|set-location|open|goto)\b/gi, " ").replace(/切换到|切到|进入|打开项目|打开|前往|去到|跳到|项目|目录|文件夹|路径|下面|下的|里的|里边的|中的|的/gi, " ");
  const rawTokens = sanitized.match(/[A-Za-z0-9._-]+|[\u4e00-\u9fa5]{2,}/g) ?? [];
  const stopwords = /* @__PURE__ */ new Set(["盘", "项目", "目录", "文件夹", "路径"]);
  return rawTokens.map((token) => token.trim()).filter((token) => token && !stopwords.has(token)).filter((token, index, all) => all.findIndex((item) => item.toLowerCase() === token.toLowerCase()) === index);
}
function getSearchRoots(driveHint) {
  if (driveHint) {
    return safeExists(driveHint) ? [driveHint] : [];
  }
  const roots = [];
  for (const letter of "CDEFGHIJKLMNOPQRSTUVWXYZ") {
    const candidate = `${letter}:\\`;
    if (safeExists(candidate)) {
      roots.push(candidate);
    }
  }
  return roots;
}
function resolveFromRoot(root, tokens, limit) {
  let candidates = [{ path: root, score: 0, depth: 0 }];
  for (const token of tokens) {
    const next = /* @__PURE__ */ new Map();
    for (const candidate of candidates) {
      for (const match of findMatchingDirectories(candidate.path, token, 3, limit)) {
        const score = candidate.score + match.score;
        const existing = next.get(match.path);
        if (!existing || score > existing.score || match.depth < existing.depth) {
          next.set(match.path, {
            path: match.path,
            score,
            depth: candidate.depth + match.depth
          });
        }
      }
    }
    if (next.size === 0) {
      return [];
    }
    candidates = [...next.values()].sort((a, b) => b.score - a.score || a.depth - b.depth || a.path.length - b.path.length).slice(0, Math.max(limit, 6));
  }
  return candidates;
}
function findMatchingDirectories(baseDir, token, maxDepth, limit) {
  const results = [];
  const normalizedToken = token.toLowerCase();
  const walk = (currentDir, depth) => {
    if (depth > maxDepth || results.length >= 50) {
      return;
    }
    let entries;
    try {
      entries = fs__namespace.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    const directories = entries.filter((entry) => entry.isDirectory());
    const ranked = directories.map((entry) => ({ entry, score: matchDirectoryName(entry.name, normalizedToken) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.entry.name.length - b.entry.name.length);
    for (const item of ranked.slice(0, Math.max(limit, 5))) {
      results.push({
        path: path__namespace.join(currentDir, item.entry.name),
        depth,
        score: item.score
      });
    }
    for (const directory of directories) {
      walk(path__namespace.join(currentDir, directory.name), depth + 1);
    }
  };
  walk(baseDir, 1);
  return results;
}
function matchDirectoryName(name, token) {
  const normalizedName = name.toLowerCase();
  if (normalizedName === token) {
    return 100;
  }
  if (normalizedName.startsWith(token)) {
    return 80;
  }
  if (normalizedName.includes(token)) {
    return 60;
  }
  return 0;
}
function safeExists(targetPath) {
  try {
    return fs__namespace.existsSync(targetPath);
  } catch {
    return false;
  }
}
function getSkillsBaseDir() {
  return path__namespace.join(os__namespace.homedir(), ".claude", "skills");
}
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)---\s*\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const frontmatter = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }
  return { frontmatter, body: match[2] };
}
function loadSkillByPath(skillDirPath) {
  const skillFilePath = path__namespace.join(skillDirPath, "SKILL.md");
  if (!safeExists(skillFilePath)) {
    return null;
  }
  try {
    const content = fs__namespace.readFileSync(skillFilePath, "utf-8");
    const { frontmatter } = parseFrontmatter(content);
    return {
      id: path__namespace.basename(skillDirPath),
      name: frontmatter.name || path__namespace.basename(skillDirPath),
      description: frontmatter.description || "",
      icon: frontmatter.icon || "🛠️",
      path: skillDirPath,
      mode: frontmatter.mode || "work",
      enabled: true,
      createdAt: safeExists(skillDirPath) ? fs__namespace.statSync(skillDirPath).mtimeMs : Date.now()
    };
  } catch {
    return null;
  }
}
function loadSkillsFromDisk() {
  const skillsDir = getSkillsBaseDir();
  if (!safeExists(skillsDir)) {
    return [];
  }
  const skills = [];
  try {
    const entries = fs__namespace.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillDirPath = path__namespace.join(skillsDir, entry.name);
        const skill = loadSkillByPath(skillDirPath);
        if (skill) {
          skills.push(skill);
        }
      }
    }
  } catch {
  }
  return skills;
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
    instances.set(id, { id, pty: ptyProcess, currentCommand: "" });
    return id;
  });
  electron.ipcMain.on("pty:input", (event, id, data) => {
    const instance = instances.get(id);
    if (!instance) return;
    if (data === "\r" || data === "\n") {
      const cmd = instance.currentCommand.trim();
      if (cmd.length > 0) {
        event.sender.send(IPC.PTY_COMMAND, id, cmd);
      }
      instance.currentCommand = "";
    } else if (data === "") {
      instance.currentCommand = instance.currentCommand.slice(0, -1);
    } else if (data.length === 1 && !data.match(/\x00-\x1f/)) {
      instance.currentCommand += data;
    }
    instance.pty.write(data);
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
  if (process.platform === "darwin") {
    switch (shell) {
      case "bash":
        return {
          file: "/bin/bash",
          args: ["--login"]
        };
      case "zsh":
      default:
        return {
          file: "/bin/zsh",
          args: ["-l"]
        };
    }
  }
  if (process.platform === "linux") {
    switch (shell) {
      case "zsh":
        return {
          file: "/bin/zsh",
          args: ["-l"]
        };
      case "bash":
      default:
        return {
          file: "/bin/bash",
          args: ["--login"]
        };
    }
  }
  switch (shell) {
    case "cmd":
      return {
        file: process.env.ComSpec || "cmd.exe",
        args: ["/k", "chcp", "65001"]
      };
    case "wsl":
      return {
        file: "wsl.exe",
        args: []
      };
    case "git-bash":
    case "bash":
      return {
        file: resolveGitBashExecutable(),
        args: ["--login"]
      };
    case "powershell":
    default:
      return {
        file: resolvePowerShellExecutable(),
        args: [
          "-NoLogo",
          "-NoExit",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          "try { chcp 65001 > $null } catch {}; try { [Console]::InputEncoding=[System.Text.UTF8Encoding]::new($false) } catch {}; try { [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false) } catch {}"
        ]
      };
  }
}
function resolvePowerShellExecutable() {
  const pwshPath = findExistingPath([
    path__namespace.join(process.env.ProgramFiles || "", "PowerShell", "7", "pwsh.exe"),
    path__namespace.join(process.env.ProgramFiles || "", "PowerShell", "6", "pwsh.exe")
  ]);
  if (pwshPath) {
    return pwshPath;
  }
  return "powershell.exe";
}
function resolveGitBashExecutable() {
  const gitBashPath = findExistingPath([
    path__namespace.join(process.env.ProgramFiles || "", "Git", "bin", "bash.exe"),
    path__namespace.join(process.env["ProgramFiles(x86)"] || "", "Git", "bin", "bash.exe")
  ]);
  if (gitBashPath) {
    return gitBashPath;
  }
  return "bash.exe";
}
function findExistingPath(candidates) {
  for (const candidate of candidates) {
    if (candidate && fs__namespace.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
let mainWindow = null;
function createWindow() {
  const isMac = process.platform === "darwin";
  const canUseTransparentWindow = process.platform !== "linux";
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: canUseTransparentWindow ? "#00000000" : "#ffffff",
    icon: path__namespace.join(__dirname, "../../logo.jpg"),
    frame: isMac,
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 14, y: 14 } : void 0,
    transparent: canUseTransparentWindow,
    roundedCorners: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path__namespace.join(__dirname, "../preload/index.js")
    },
    show: false,
    vibrancy: isMac ? "under-window" : void 0
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
