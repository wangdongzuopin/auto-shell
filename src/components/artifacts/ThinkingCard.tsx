import { useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { Brain, GitCompare, GitBranch, BarChart3, Lightbulb, Copy, Check, Download } from "lucide-react"

interface ThinkingCardProps {
  content: string
  className?: string
}

type CardType = "analysis" | "compare" | "decision" | "evaluate" | "general"

const typeLabelKeys: Record<CardType, string> = {
  analysis:  "artifacts.thinkingAnalysis",
  compare:   "artifacts.thinkingCompare",
  decision:  "artifacts.thinkingDecision",
  evaluate:  "artifacts.thinkingEvaluate",
  general:   "artifacts.thinkingGeneral",
}

function detectCardType(text: string): CardType {
  const lower = text.toLowerCase()
  if (lower.includes("问题分析") || lower.includes("根因") || lower.includes("根本原因")) return "analysis"
  if (lower.includes("对比") || lower.includes("方案") || lower.includes("优劣") || lower.includes("优缺点")) return "compare"
  if (lower.includes("决策") || lower.includes("选择") || lower.includes("建议") || lower.includes("推荐")) return "decision"
  if (lower.includes("评估") || lower.includes("评分") || lower.includes("指标") || lower.includes("swot")) return "evaluate"
  return "general"
}

export function isThinkingContent(text: string): boolean {
  if (text.length < 80) return false

  // Numbered list with bold headers (1. **Header**: content)
  if (/^(?:\d+[\.\、\)]\s*\*\*[^*]+\*\*)/m.test(text)) return true

  // Markdown table with 3+ columns
  if (/\|.+\|.+\|.+\|/.test(text) && (text.match(/\|/g) || []).length >= 6) return true

  // SWOT or structured analysis pattern
  if (/(?:优势|劣势|机会|威胁|strength|weakness|opportunity|threat)/i.test(text) &&
      text.split(/\n\s*\n/).filter(p => p.trim().length > 30).length >= 3) return true

  return false
}

export function ThinkingCard({ content, className }: ThinkingCardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false)
  const type = detectCardType(content)
  const label = t(typeLabelKeys[type])
  const accentMap: Record<CardType, string> = {
    analysis: "border-l-forge-blue",
    compare: "border-l-forge-green",
    decision: "border-l-accent-pm",
    evaluate: "border-l-forge-orange",
    general: "border-l-forge-purple",
  }
  const accent = accentMap[type]
  const iconMap: Record<CardType, typeof Brain> = {
    analysis: Brain, compare: GitCompare, decision: GitBranch, evaluate: BarChart3, general: Lightbulb,
  }
  const Icon = iconMap[type]

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [content])

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.download = `thinking-${Date.now()}.md`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }, [content])

  return (
    <div className={cn(
      "group relative my-3 rounded-xl border border-border/50 bg-glass-bg-strong backdrop-blur-xl overflow-hidden transition-all hover:border-border/70",
      className
    )}>
      {/* Accent left bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", accent.replace("border-l-", "bg-"))} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-bg-elevated/30">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-6 w-6 items-center justify-center rounded-lg bg-bg-elevated/60", accent.replace("border-l-", "text-"))}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-[11px] font-semibold text-text-primary">{label}</span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={handleCopy}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-colors"
            title={t("artifacts.copyContent")}
          >
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-colors"
            title={t("artifacts.downloadMarkdown")}
          >
            <Download className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5 text-xs leading-relaxed text-text-secondary prose prose-sm prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className: codeClassName, children, ...props }) {
              const match = /language-(\w+)/.exec(codeClassName || "");
              if (!match) {
                return (
                  <code className="px-1 py-0.5 rounded bg-bg-hover/60 text-[10px] font-mono text-accent-dev" {...props}>
                    {children}
                  </code>
                );
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
            li({ children, ...props }) {
              return <li className="text-xs" {...props}>{children}</li>;
            },
            h1({ children, ...props }) {
              return <h1 className="text-sm font-semibold text-text-primary mt-3 mb-1.5" {...props}>{children}</h1>;
            },
            h2({ children, ...props }) {
              return <h2 className="text-[13px] font-semibold text-text-primary mt-2 mb-1" {...props}>{children}</h2>;
            },
            h3({ children, ...props }) {
              return <h3 className="text-xs font-semibold text-text-primary mt-1.5 mb-1" {...props}>{children}</h3>;
            },
            table({ children, ...props }) {
              return (
                <div className="overflow-x-auto my-1.5">
                  <table className="min-w-full text-[10px] border-collapse" {...props}>{children}</table>
                </div>
              );
            },
            th({ children, ...props }) {
              return <th className="border border-border/50 px-2 py-1 bg-bg-elevated/50 font-medium text-text-primary text-left" {...props}>{children}</th>;
            },
            td({ children, ...props }) {
              return <td className="border border-border/50 px-2 py-1 text-text-secondary" {...props}>{children}</td>;
            },
            blockquote({ children, ...props }) {
              return (
                <blockquote className="border-l-2 border-accent-pm/30 pl-3 my-1.5 text-text-tertiary italic" {...props}>
                  {children}
                </blockquote>
              );
            },
            a({ href, children, ...props }) {
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-dev underline underline-offset-2 hover:opacity-80" {...props}>
                  {children}
                </a>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
