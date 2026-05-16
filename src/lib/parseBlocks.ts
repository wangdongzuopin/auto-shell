export interface ContentBlock {
  type: "markdown" | "mermaid" | "prototype" | "code" | "think"
  content: string
  language?: string
}

// Strip partial <think> / </think> tag fragments from end of streaming content
function stripPartialTags(content: string): string {
  return content
    .replace(/<(?:t(?:h(?:i(?:n(?:k)?)?)?)?)?$/i, "")
    .replace(/<\/(?:t(?:h(?:i(?:n(?:k)?)?)?)?)?$/i, "");
}

// Split content by <think>...</think> blocks, returning interleaved segments
function splitThinkBlocks(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const thinkRe = /<think>([\s\S]*?)<\/think>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = thinkRe.exec(content)) !== null) {
    // Markdown before this think block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) blocks.push({ type: "markdown", content: text });
    }
    // The think block
    const thinkContent = match[1].trim();
    if (thinkContent) blocks.push({ type: "think", content: thinkContent });
    lastIndex = match.index + match[0].length;
  }

  // Remaining content after last think block
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) blocks.push({ type: "markdown", content: text });
  }

  return blocks;
}

// Further split markdown blocks into code/mermaid/prototype
function splitCodeBlocks(mdContent: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(mdContent)) !== null) {
    if (match.index > lastIndex) {
      const text = mdContent.slice(lastIndex, match.index).trim();
      if (text) blocks.push({ type: "markdown", content: text });
    }

    const lang = (match[1] || "").toLowerCase();
    const code = match[2].trim();

    if (lang === "mermaid") {
      blocks.push({ type: "mermaid", content: code, language: "mermaid" });
    } else if (lang === "html" || lang === "htm") {
      blocks.push({ type: "prototype", content: code, language: "html" });
    } else {
      blocks.push({ type: "code", content: code, language: lang || "text" });
    }

    lastIndex = match.index + match[0].length;
  }

  // Handle trailing content after last code block
  if (lastIndex < mdContent.length) {
    const text = mdContent.slice(lastIndex).trim();
    if (text) {
      // Check for unclosed ```html (streaming) — show as live prototype preview
      const unclosedHtml = /```(html|htm)\s*\n?([\s\S]*)$/i.exec(text);
      if (unclosedHtml) {
        const prefix = text.slice(0, unclosedHtml.index).trim();
        if (prefix) blocks.push({ type: "markdown", content: prefix });
        blocks.push({ type: "prototype", content: unclosedHtml[2].trim(), language: "html" });
      } else {
        // Check for unclosed ```mermaid (streaming) — show as live diagram
        const unclosedMermaid = /```mermaid\s*\n?([\s\S]*)$/i.exec(text);
        if (unclosedMermaid) {
          const prefix = text.slice(0, unclosedMermaid.index).trim();
          if (prefix) blocks.push({ type: "markdown", content: prefix });
          blocks.push({ type: "mermaid", content: unclosedMermaid[1].trim() });
        } else {
          blocks.push({ type: "markdown", content: text });
        }
      }
    }
  }

  return blocks;
}

// Streaming-aware split: treats unclosed <think> as a think block in progress
function splitThinkBlocksStreaming(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const thinkRe = /<think>([\s\S]*?)<\/think>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = thinkRe.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) blocks.push({ type: "markdown", content: text });
    }
    const thinkContent = match[1].trim();
    if (thinkContent) blocks.push({ type: "think", content: thinkContent });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) {
      const unclosedThink = /^<think>([\s\S]*)$/i.exec(remaining);
      if (unclosedThink) {
        const thinkContent = unclosedThink[1].trim();
        if (thinkContent) blocks.push({ type: "think", content: thinkContent });
      } else {
        blocks.push({ type: "markdown", content: remaining });
      }
    }
  }

  return blocks;
}

export function parseBlocksStreaming(content: string): ContentBlock[] {
  const sanitized = stripPartialTags(content);
  const thinkBlocks = splitThinkBlocksStreaming(sanitized);
  const result: ContentBlock[] = [];
  for (const block of thinkBlocks) {
    if (block.type === "think") {
      result.push(block);
    } else {
      result.push(...splitCodeBlocks(block.content));
    }
  }
  return result;
}

export function parseBlocks(content: string): ContentBlock[] {
  // Step 1: split by think tags
  const thinkBlocks = splitThinkBlocks(content);

  // Step 2: further split markdown blocks for code/mermaid/prototype
  const result: ContentBlock[] = [];
  for (const block of thinkBlocks) {
    if (block.type === "think") {
      result.push(block);
    } else {
      result.push(...splitCodeBlocks(block.content));
    }
  }

  return result;
}
