import type { Message } from "@/stores/projectStore"

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function simpleMarkdownToHtml(md: string): string {
  let html = md
  // Code blocks (fenced)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const escaped = escapeHtml(code.trim())
    return `<pre class="code-block"><code class="language-${lang || 'text'}">${escaped}</code></pre>`
  })
  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>")
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  // Italic
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>")
  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>")
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>")
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>")
  // Lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>")
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, "</p><p>")
  html = "<p>" + html + "</p>"
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "")
  html = html.replace(/<p>(<h[123]>)/g, "$1")
  html = html.replace(/(<\/h[123]>)<\/p>/g, "$1")

  return html
}

export function exportConversationToMarkdown(messages: Message[], title: string): void {
  let md = `# ${title}\n\n`
  md += `> 导出时间: ${new Date().toLocaleString("zh-CN")}\n\n---\n\n`

  for (const msg of messages) {
    const roleLabel = msg.role === "user" ? "**用户**" : "**AI 助手**"
    const time = new Date(msg.timestamp).toLocaleString("zh-CN")
    md += `## ${roleLabel}\n\n`
    md += `*${time}*\n\n`
    md += msg.content
    md += "\n\n---\n\n"
  }

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.download = `${title}-对话记录.md`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

export function exportConversationToHTML(messages: Message[], title: string): void {
  const parts: string[] = []

  parts.push(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - 对话报告</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"><\/script>
  <style>
    :root {
      --bg: #0f172a;
      --surface: #1e293b;
      --border: #334155;
      --text: #f1f5f9;
      --text-secondary: #94a3b8;
      --accent: #a78bfa;
      --user-bg: #3b82f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      padding: 40px 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 1.5rem; margin-bottom: 8px; }
    .meta { color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 32px; }
    .message { margin-bottom: 24px; padding: 16px; border-radius: 12px; border: 1px solid var(--border); }
    .message.user { background: color-mix(in srgb, var(--user-bg) 15%, var(--bg)); border-color: color-mix(in srgb, var(--user-bg) 30%, var(--border)); }
    .message.assistant { background: var(--surface); }
    .role { font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; color: var(--accent); }
    .time { font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 12px; }
    pre.code-block { background: #0f172a; border: 1px solid var(--border); border-radius: 8px; padding: 12px; overflow-x: auto; font-size: 0.8rem; margin: 8px 0; }
    code { background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-size: 0.85em; }
    pre code { background: none; padding: 0; }
    ul { padding-left: 20px; margin: 8px 0; }
    li { margin: 4px 0; }
    h1, h2, h3 { margin: 12px 0 6px; }
    p { margin: 6px 0; }
    hr { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
    .mermaid-block { background: #0f172a; border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin: 12px 0; text-align: center; }
    .mermaid-block pre { background: none; }
    @media print {
      body { padding: 0; background: white; color: #0f172a; }
      .message { break-inside: avoid; border-color: #e2e8f0; }
      .message.user { background: #eff6ff; }
      .message.assistant { background: #f8fafc; }
    }
  </style>
</head>
<body>`)

  parts.push(`<h1>${escapeHtml(title)}</h1>`)
  parts.push(`<p class="meta">导出时间: ${new Date().toLocaleString("zh-CN")} | 共 ${messages.length} 条消息</p>`)

  for (const msg of messages) {
    const roleLabel = msg.role === "user" ? "用户" : "AI 助手"
    const time = new Date(msg.timestamp).toLocaleString("zh-CN")
    let body = simpleMarkdownToHtml(msg.content)

    // Wrap mermaid code blocks specially
    body = body.replace(
      /<pre class="code-block"><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      '<div class="mermaid-block"><pre class="mermaid">$1</pre></div>'
    )

    parts.push(`
<div class="message ${msg.role}">
  <div class="role">${roleLabel}</div>
  <div class="time">${time}</div>
  <div class="body">${body}</div>
</div>`)
  }

  parts.push(`
<script>
  mermaid.initialize({ startOnLoad: true, theme: 'dark' });
<\/script>
</body>
</html>`)

  const html = parts.join("\n")
  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.download = `${title}-完整报告.html`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}
