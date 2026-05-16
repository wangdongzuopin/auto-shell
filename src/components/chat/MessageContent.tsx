import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { MermaidDiagram } from "@/components/artifacts/MermaidDiagram";
import { PrototypePreview } from "@/components/artifacts/PrototypePreview";
import { ThinkingCard, isThinkingContent } from "@/components/artifacts/ThinkingCard";
import { cn } from "@/lib/utils";
import { parseBlocks, parseBlocksStreaming } from "@/lib/parseBlocks";
import { Copy, Check, Brain, ChevronDown, ChevronUp, Zap, FileCode } from "lucide-react";

const FILE_PATH_RE = /(?:(?:\.{0,2}\/)|(?:[a-zA-Z]:\\))[\w\-./\\]+\.\w{1,6}/g;

function isFilePath(text: string): boolean {
  return /^(?:(?:\.{0,2}\/)|(?:[a-zA-Z]:\\))[\w\-./\\]+\.\w{1,6}$/.test(text);
}

function wrapFilePathsInText(text: string): string {
  return text.replace(FILE_PATH_RE, (match) => `\`${match}\``);
}

interface MessageContentProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

// Code block with copy button + collapse for long blocks
const CODE_COLLAPSE_THRESHOLD = 20;

function CodeBlock({ code, language }: { code: string; language: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n").length;
  const isLong = lines > CODE_COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(!isLong);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="group relative my-3 rounded-xl border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-elevated/60 border-b border-border/30">
        <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
          {language || "code"}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-colors"
          >
            {copied ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            <span className="text-[10px]">{copied ? t("chat.copied") : t("chat.copy")}</span>
          </button>
        </div>
      </div>
      <div className={!expanded ? "relative" : ""}>
        <SyntaxHighlighter
          style={oneDark}
          language={language || "text"}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "12px 16px",
            background: "var(--tk-bg-elevated)",
            fontSize: "12px",
            borderRadius: 0,
            borderBottomLeftRadius: expanded || !isLong ? "0.75rem" : "0",
            borderBottomRightRadius: expanded || !isLong ? "0.75rem" : "0",
            userSelect: "text",
            ...(!expanded ? { maxHeight: `${CODE_COLLAPSE_THRESHOLD * 1.6}em`, overflow: "hidden" } : {}),
          }}
        >
          {code}
        </SyntaxHighlighter>
        {!expanded && (
          <div className="absolute inset-0 top-0 bg-gradient-to-t from-bg-elevated/90 via-bg-elevated/40 to-transparent pointer-events-none" />
        )}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] text-text-tertiary hover:text-text-secondary hover:bg-bg-hover/20 transition-colors border-t border-border/30"
        >
          {expanded ? (
            <><ChevronUp className="h-3 w-3" /> {t("chat.collapse")}</>
          ) : (
            <><ChevronDown className="h-3 w-3" /> {t("chat.expand", { lines })}</>
          )}
        </button>
      )}
    </div>
  );
}

// Clickable file path chip
function FilePathChip({ path }: { path: string }) {
  const handleClick = () => {
    navigator.clipboard.writeText(path);
  };

  return (
    <button
      onClick={handleClick}
      title={`点击复制: ${path}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md text-[10px] font-mono text-accent-dev bg-accent-dev/5 border border-accent-dev/15 hover:bg-accent-dev/10 hover:border-accent-dev/30 transition-all cursor-pointer align-baseline"
    >
      <FileCode className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate max-w-[200px]">{path}</span>
    </button>
  );
}

// Collapsible think block for AI reasoning
function ThinkBlock({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(isStreaming ?? false);

  return (
    <div className="my-2 rounded-xl border border-accent-product/20 bg-accent-product/[0.03] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover/30 transition-colors"
      >
        <Brain className="h-3.5 w-3.5 text-accent-product/60 shrink-0" />
        <span className="text-[11px] font-medium text-text-secondary">{t("chat.thinkingProcess")}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-text-tertiary ml-auto transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0 border-t border-accent-product/10">
          <div className="text-[11px] leading-relaxed text-text-tertiary select-text prose prose-sm prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className: codeClassName, children, ...props }) {
                  const match = /language-(\w+)/.exec(codeClassName || "");
                  if (!match) {
                    const text = String(children);
                    if (isFilePath(text)) return <FilePathChip path={text} />;
                    return (
                      <code className="px-1 py-0.5 rounded bg-bg-hover/60 text-[10px] font-mono text-accent-dev" {...props}>
                        {children}
                      </code>
                    );
                  }
                  return <code className={codeClassName} {...props}>{children}</code>;
                },
                p({ children, ...props }) {
                  return <p className="text-[11px] leading-relaxed my-1" {...props}>{children}</p>;
                },
                strong({ children, ...props }) {
                  return <strong className="font-semibold text-text-secondary" {...props}>{children}</strong>;
                },
                ul({ children, ...props }) {
                  return <ul className="list-disc list-inside space-y-0.5 my-1" {...props}>{children}</ul>;
                },
                ol({ children, ...props }) {
                  return <ol className="list-decimal list-inside space-y-0.5 my-1" {...props}>{children}</ol>;
                },
              }}
            >
              {wrapFilePathsInText(content)}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export function MessageContent({ content, className, isStreaming }: MessageContentProps) {
  // Extract <!-- skill:XXX --> markers from content
  const { skillNames, cleanContent } = useMemo(() => {
    const names: string[] = [];
    const skillRe = /<!--\s*skill:\s*(.+?)\s*-->/g;
    let m: RegExpExecArray | null;
    while ((m = skillRe.exec(content)) !== null) {
      const name = m[1].trim();
      if (name && !names.includes(name)) {
        names.push(name);
      }
    }
    const cleaned = content.replace(skillRe, "").trim();
    return { skillNames: names, cleanContent: cleaned };
  }, [content]);

  const blocks = useMemo(
    () => isStreaming ? parseBlocksStreaming(cleanContent) : parseBlocks(cleanContent),
    [cleanContent, isStreaming]
  );

  if (blocks.length === 0 && skillNames.length === 0) {
    return (
      <div className={cn("text-xs leading-relaxed text-text-secondary prose prose-sm prose-invert max-w-none", className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className: codeClassName, children, ...props }) {
              const match = /language-(\w+)/.exec(codeClassName || "");
              if (!match) {
                const text = String(children);
                if (isFilePath(text)) return <FilePathChip path={text} />;
                return <code className="px-1 py-0.5 rounded bg-bg-hover/60 text-[10px] font-mono text-accent-dev" {...props}>{children}</code>;
              }
              return <code className={codeClassName} {...props}>{children}</code>;
            },
            p({ children, ...props }) {
              return <p className="text-xs leading-relaxed my-1" {...props}>{children}</p>;
            },
            strong({ children, ...props }) {
              return <strong className="font-semibold text-text-primary" {...props}>{children}</strong>;
            },
            ul({ children, ...props }) {
              return <ul className="list-disc list-inside space-y-0.5 my-1" {...props}>{children}</ul>;
            },
            ol({ children, ...props }) {
              return <ol className="list-decimal list-inside space-y-0.5 my-1" {...props}>{children}</ol>;
            },
          }}
        >
          {wrapFilePathsInText(cleanContent || content)}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Skill invocation badges */}
      {skillNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {skillNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-accent-pm/10 text-accent-pm border border-accent-pm/20"
            >
              <Zap className="h-2.5 w-2.5" />
              {name}
            </span>
          ))}
        </div>
      )}
      {blocks.map((block, i) => {
        switch (block.type) {
          case "think":
            return <ThinkBlock key={i} content={block.content} isStreaming={isStreaming} />;

          case "mermaid":
            return <MermaidDiagram key={i} code={block.content} />;

          case "prototype":
            return <PrototypePreview key={i} code={block.content} />;

          case "code":
            return <CodeBlock key={i} code={block.content} language={block.language || "text"} />;

          case "markdown":
            if (isThinkingContent(block.content)) {
              return <ThinkingCard key={i} content={block.content} />
            }
            return (
              <div key={i} className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed select-text">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Inline code
                    code({ className: codeClassName, children, ...props }) {
                      const match = /language-(\w+)/.exec(codeClassName || "");
                      if (!match) {
                        const text = String(children);
                        if (isFilePath(text)) return <FilePathChip path={text} />;
                        return (
                          <code
                            className="px-1 py-0.5 rounded-md bg-bg-hover/60 text-[11px] font-mono text-accent-dev"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }
                      return <code className={codeClassName} {...props}>{children}</code>;
                    },
                    // Links
                    a({ href, children, ...props }) {
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-dev underline underline-offset-2 hover:opacity-80"
                          {...props}
                        >
                          {children}
                        </a>
                      );
                    },
                    // Headings
                    h1({ children, ...props }) {
                      return <h1 className="text-sm font-semibold text-text-primary mt-4 mb-2" {...props}>{children}</h1>;
                    },
                    h2({ children, ...props }) {
                      return <h2 className="text-[13px] font-semibold text-text-primary mt-3 mb-1.5" {...props}>{children}</h2>;
                    },
                    h3({ children, ...props }) {
                      return <h3 className="text-xs font-semibold text-text-primary mt-2 mb-1" {...props}>{children}</h3>;
                    },
                    // Lists
                    ul({ children, ...props }) {
                      return <ul className="list-disc list-inside space-y-0.5 my-2 text-text-secondary" {...props}>{children}</ul>;
                    },
                    ol({ children, ...props }) {
                      return <ol className="list-decimal list-inside space-y-0.5 my-2 text-text-secondary" {...props}>{children}</ol>;
                    },
                    li({ children, ...props }) {
                      return <li className="text-xs" {...props}>{children}</li>;
                    },
                    // Blockquote
                    blockquote({ children, ...props }) {
                      return (
                        <blockquote
                          className="border-l-2 border-accent-dev/30 pl-3 my-2 text-text-tertiary italic"
                          {...props}
                        >
                          {children}
                        </blockquote>
                      );
                    },
                    // Paragraph
                    p({ children, ...props }) {
                      return <p className="text-xs leading-relaxed my-1.5" {...props}>{children}</p>;
                    },
                    // Strong
                    strong({ children, ...props }) {
                      return <strong className="font-semibold text-text-primary" {...props}>{children}</strong>;
                    },
                    // Table
                    table({ children, ...props }) {
                      return (
                        <div className="overflow-x-auto my-2">
                          <table className="min-w-full text-[11px] border-collapse" {...props}>
                            {children}
                          </table>
                        </div>
                      );
                    },
                    th({ children, ...props }) {
                      return <th className="border border-border/50 px-2 py-1 bg-bg-elevated/50 font-medium text-text-primary text-left" {...props}>{children}</th>;
                    },
                    td({ children, ...props }) {
                      return <td className="border border-border/50 px-2 py-1 text-text-secondary" {...props}>{children}</td>;
                    },
                    // Horizontal rule
                    hr() {
                      return <hr className="my-3 border-border/30" />;
                    },
                  }}
                >
                  {wrapFilePathsInText(block.content)}
                </ReactMarkdown>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
