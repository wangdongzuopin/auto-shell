import type { AISettings } from "@/stores/settingsStore";
import type { Skill, StreamEvent } from "@/types/commands";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolCallStartedData {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolCallCompletedData {
  id: string;
  name: string;
  result: string;
  success: boolean;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (err: Error) => void;
  onToolCallStarted?: (data: ToolCallStartedData) => void;
  onToolCallCompleted?: (data: ToolCallCompletedData) => void;
}

// Tool definitions for OpenAI function calling
const TOOL_DEFINITIONS = [
  {
    name: "read_file",
    description: "Read the contents of a file",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "The file path to read" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "The file path to write" },
        content: { type: "string", description: "The content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_directory",
    description: "List files and directories in a given path",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "The directory path to list" },
      },
      required: ["path"],
    },
  },
  {
    name: "search_code",
    description: "Search for code in the project files using full-text search",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "search_knowledge",
    description: "Search the knowledge base for relevant entries",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_knowledge",
    description: "Get a knowledge base entry by ID",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "The knowledge entry ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_knowledge",
    description: "Create a new knowledge base entry",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the entry" },
        content: { type: "string", description: "Content of the entry" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for categorization",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "list_skills",
    description: "List all enabled skills",
    parameters: { type: "object", properties: {} },
  },
];

export async function streamChat(
  messages: ChatMessage[],
  config: AISettings,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
  includeTools = false
) {
  const { apiKey, baseUrl, model, temperature } = config;

  if (!apiKey) {
    callbacks.onError(new Error("请先在设置中配置 API Key"));
    return;
  }

  const isAnthropic = false;
  const tools = includeTools ? TOOL_DEFINITIONS : [];

  const payload = {
    baseUrl,
    apiKey,
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    isAnthropic,
    temperature,
    tools,
  };

  // Try Tauri IPC channel first (no CORS)
  try {
    const { Channel, invoke } = await import("@tauri-apps/api/core");
    const channel = new Channel<StreamEvent>();
    let fullText = "";

    channel.onmessage = (event: StreamEvent) => {
      switch (event.type) {
        case "TextDelta":
          fullText += event.data;
          callbacks.onToken(event.data);
          break;
        case "ToolCallStarted":
          callbacks.onToolCallStarted?.(event.data);
          break;
        case "ToolCallCompleted":
          callbacks.onToolCallCompleted?.(event.data);
          break;
        case "Done":
          callbacks.onDone(fullText);
          break;
        case "Error":
          callbacks.onError(new Error(event.data));
          break;
      }
    };

    await invoke("stream_ai_chat", { channel, ...payload });
    return;
  } catch (tauriErr: any) {
    console.log("[AI] Tauri IPC failed, trying fetch fallback:", tauriErr?.message || tauriErr);
  }

  // Fallback: direct SSE fetch via cors-fetch plugin
  await streamViaDirectFetch(messages, config, callbacks, abortSignal);
}

// ── Direct SSE fetch via cors-fetch plugin (web mode fallback) ──

async function streamViaDirectFetch(
  messages: ChatMessage[],
  config: AISettings,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
) {
  const { apiKey, baseUrl, model, temperature } = config;

  const body = JSON.stringify({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature,
    stream: true,
  });

  const url = `${baseUrl}/chat/completions`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      signal: abortSignal,
    });

    if (!response.ok) {
      const et = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${et}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            callbacks.onToken(delta);
          }
        } catch {
          // skip unparseable chunks
        }
      }
    }

    callbacks.onDone(fullText);
  } catch (err: any) {
    if (err?.name === "AbortError") return;
    console.error("[AI DirectFetch]", err?.message);
    callbacks.onError(new Error(formatError(err?.message || "未知错误")));
  }
}

function formatError(detail: string): string {
  if (detail.includes("401")) return `API Key 无效 (${detail})，请检查设置`;
  if (detail.includes("429")) return "请求过于频繁，请稍后重试";
  if (detail.includes("ENOTFOUND") || detail.includes("fetch")) return `网络连接失败: ${detail}`;
  return `AI 请求失败: ${detail}`;
}

export function buildSystemPrompt(
  role: "developer" | "product",
  mode: "qa" | "edit",
  skills?: Skill[]
): string {
  let prompt = "";

  if (role === "developer") {
    prompt =
      mode === "qa"
        ? `你是 pizz 一站式助手，一个专业的全栈开发助手。你的职责是：
  - 回答用户的编程问题，提供清晰、准确的代码示例
  - 解释复杂的技术概念
  - 分析代码中的问题和改进空间
  - 给出最佳实践建议

回答时请：
  - 使用 Markdown 格式组织内容
  - 代码块标注语言类型
  - 对关键概念加粗强调
  - 如有多个方案，列出优劣对比`
        : `你是 pizz 一站式助手，一个专业的全栈开发助手，当前处于编辑模式。你的职责是：
  - 根据用户需求直接修改代码
  - 输出修改后的完整文件内容或 diff
  - 解释你做了哪些修改以及为什么

回复格式：
  1. 先用自然语言解释修改思路
  2. 用 \`\`\`diff 代码块展示变更
  3. 用 \`\`\`语言 代码块展示修改后的完整代码`;
  } else {
    prompt = `你是 pizz 一站式助手，一个专业的产品设计助手。你的职责是：
- 帮助用户分析需求、设计产品功能
- 绘制流程图（使用 Mermaid 语法）
- 设计原型方案（使用 HTML + Tailwind CSS）
- 评估解决方案的可行性

当你生成流程图时：
- 使用 \`\`\`mermaid 代码块
- 流程图类型根据需求选择：graph TD（流程）、sequenceDiagram（时序）、classDiagram（类图）、stateDiagram（状态机）、erDiagram（ER图）等
- 使用中文标签，让图表清晰易读

当你生成原型图时：
- 使用 \`\`\`html 代码块
- 使用 Tailwind CSS CDN 进行样式设计
- 原型应包含完整的页面结构（导航、内容区、操作按钮等）
- 使用合适的中文文案，模拟真实数据
- 颜色使用专业的产品色调

其他回答要求：
- 使用结构化方式呈现信息
- 给出多种方案并对比优劣
- 对关键决策点进行深入分析`;
  }

  // Inject enabled skills into system prompt
  if (skills && skills.length > 0) {
    prompt += "\n\n## 可用技能\n\n";
    for (const skill of skills) {
      prompt += `### ${skill.name}\n${skill.description}\n${skill.content}\n\n`;
    }
    prompt += "在回答时，参考并遵循以上技能中的指令。";
    prompt += "\n\n**重要**：在回答的最开头，声明你使用了哪些技能。每个技能使用一行 `<!-- skill:技能名称 -->` 格式的标记。";
    prompt += "\n例如：";
    prompt += "\n```";
    prompt += "\n<!-- skill:代码规范与最佳实践 -->";
    prompt += "\n<!-- skill:代码安全审查 -->";
    prompt += "\n";
    prompt += "\n（这里是正常回答内容...）";
    prompt += "\n```";
  }

  return prompt;
}
