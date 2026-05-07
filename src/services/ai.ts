import type { AISettings } from "@/stores/settingsStore";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (err: Error) => void;
}

export async function streamChat(
  messages: ChatMessage[],
  config: AISettings,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
) {
  const { apiKey, baseUrl, model, temperature } = config;

  if (!apiKey) {
    callbacks.onError(new Error("请先在设置中配置 API Key"));
    return;
  }

  const isAnthropic = false; // MiniMax now uses OpenAI-compatible endpoint
  const payload = {
    baseUrl,
    apiKey,
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    isAnthropic,
    temperature,
  };

  // Try Tauri IPC channel first (no CORS)
  try {
    const { Channel, invoke } = await import("@tauri-apps/api/core");
    const channel = new Channel<string>();
    let fullText = "";

    channel.onmessage = (token: string) => {
      if (token === "__DONE__") {
        callbacks.onDone(fullText);
        return;
      }
      fullText += token;
      callbacks.onToken(token);
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

export function buildSystemPrompt(role: "developer" | "product", mode: "qa" | "edit"): string {
  if (role === "developer") {
    return mode === "qa"
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
  }

  return `你是 pizz 一站式助手，一个专业的产品设计助手。你的职责是：
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
