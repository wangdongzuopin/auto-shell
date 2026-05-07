import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { FileDiff, RotateCcw, Eye } from "lucide-react"

interface DiffEntry {
  id: string
  path: string
  diff: string
  type: "add" | "modify" | "delete"
}

export function DiffView() {
  // In a full implementation, these would come from tool call results
  const [diffs] = useState<DiffEntry[]>([])

  const getTypeStyle = (type: DiffEntry["type"]) => {
    switch (type) {
      case "add": return "text-success"
      case "modify": return "text-warning"
      case "delete": return "text-danger"
    }
  }

  const getTypeLabel = (type: DiffEntry["type"]) => {
    switch (type) {
      case "add": return "A"
      case "modify": return "M"
      case "delete": return "D"
    }
  }

  if (diffs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <FileDiff className="h-8 w-8 text-text-tertiary/40 mb-2" />
        <p className="text-xs text-text-tertiary">暂无文件变更</p>
        <p className="text-[10px] text-text-tertiary/50 mt-1">
          AI 工具调用产生的文件变更将在此展示
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {diffs.map((diff) => (
          <div
            key={diff.id}
            className="group rounded-lg border border-border/30 bg-bg-elevated/30 p-2.5 transition-all hover:border-border/50"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn("text-[10px] font-mono font-bold", getTypeStyle(diff.type))}>
                  {getTypeLabel(diff.type)}
                </span>
                <span className="text-[11px] text-text-primary font-mono truncate">{diff.path}</span>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                <button className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors" title="查看">
                  <Eye className="h-3 w-3" />
                </button>
                <button className="p-1 rounded text-text-tertiary hover:text-danger transition-colors" title="还原">
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            </div>
            <pre className="text-[10px] text-text-secondary font-mono leading-relaxed max-h-32 overflow-hidden opacity-70">
              {diff.diff}
            </pre>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
