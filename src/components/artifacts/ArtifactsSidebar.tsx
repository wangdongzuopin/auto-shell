import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useProjectStore } from "@/stores/projectStore"
import { parseBlocks, type ContentBlock } from "@/lib/parseBlocks"
import { MermaidDiagram } from "@/components/artifacts/MermaidDiagram"
import { PrototypePreview } from "@/components/artifacts/PrototypePreview"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { GitGraph, Layout, Download, ChevronDown, ChevronRight, PackageOpen } from "lucide-react"

interface ArtifactEntry {
  id: string
  type: "mermaid" | "prototype"
  content: string
  messageId: string
  timestamp: number
}

export function ArtifactsSidebar() {
  const { t } = useTranslation();
  const { currentConversationId, getMessages, messages } = useProjectStore()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const artifacts = useMemo(() => {
    if (!currentConversationId) return []
    const conversationMessages = getMessages(currentConversationId)
    const entries: ArtifactEntry[] = []

    for (const msg of conversationMessages) {
      if (msg.role !== "assistant") continue
      const blocks = parseBlocks(msg.content)
      for (const block of blocks) {
        if (block.type === "mermaid" || block.type === "prototype") {
          entries.push({
            id: `${msg.id}-${entries.length}`,
            type: block.type,
            content: block.content,
            messageId: msg.id,
            timestamp: msg.timestamp,
          })
        }
      }
    }
    return entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId, messages])

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const downloadAll = () => {
    for (const a of artifacts) {
      const ext = a.type === "mermaid" ? "svg" : "html"
      const mime = a.type === "mermaid" ? "image/svg+xml" : "text/html"
      const blob = new Blob([a.content], { type: `${mime};charset=utf-8` })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.download = `artifact-${a.id}.${ext}`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <PackageOpen className="h-8 w-8 text-text-tertiary/40 mb-2" />
        <p className="text-xs text-text-tertiary">{t("artifacts.noArtifacts")}</p>
        <p className="text-[10px] text-text-tertiary/50 mt-1">
          {t("artifacts.noArtifactsHint")}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Batch download */}
      <div className="px-3 py-2 border-b border-border/30">
        <button
          onClick={downloadAll}
          className="flex items-center gap-1.5 w-full justify-center px-3 py-1.5 rounded-lg text-[11px] font-medium text-text-secondary hover:text-text-primary bg-bg-elevated/40 hover:bg-bg-elevated/60 border border-border/30 transition-all"
        >
          <Download className="h-3 w-3" />
          {t("artifacts.downloadAll")} ({artifacts.length})
        </button>
      </div>

      {/* Artifact list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {artifacts.map((a) => {
            const isExpanded = expandedIds.has(a.id)
            const isMermaid = a.type === "mermaid"
            const firstLine = a.content.split("\n")[0].slice(0, 60)

            return (
              <div
                key={a.id}
                className="rounded-lg border border-border/30 bg-bg-elevated/20 overflow-hidden transition-all hover:border-border/50"
              >
                {/* List item header */}
                <button
                  onClick={() => toggleExpanded(a.id)}
                  className="flex items-center gap-2 w-full px-2.5 py-2 text-left transition-colors hover:bg-bg-hover/20"
                >
                  {isMermaid ? (
                    <GitGraph className="h-3.5 w-3.5 text-accent-dev shrink-0" />
                  ) : (
                    <Layout className="h-3.5 w-3.5 text-accent-pm shrink-0" />
                  )}
                  <span className="text-[11px] text-text-primary font-medium truncate flex-1">
                    {isMermaid ? t("artifacts.flowchart") : t("artifacts.prototype")}
                  </span>
                  <span className="text-[10px] text-text-tertiary/50 font-mono">
                    {new Date(a.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-text-tertiary" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-text-tertiary" />
                  )}
                </button>

                {/* Expanded preview */}
                {isExpanded && (
                  <div className="px-2 pb-2">
                    <div className="text-[10px] text-text-tertiary/70 mb-1.5 truncate px-0.5">
                      {firstLine}
                    </div>
                    <div className="rounded-lg border border-border/20 overflow-hidden bg-bg-base/60">
                      {isMermaid ? (
                        <MermaidDiagram code={a.content} className="my-0 rounded-none border-0" />
                      ) : (
                        <PrototypePreview code={a.content} className="my-0 rounded-none border-0" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
