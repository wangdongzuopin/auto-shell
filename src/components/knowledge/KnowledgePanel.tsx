import { useState, useEffect } from "react"
import { useKnowledgeStore } from "@/stores/knowledgeStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { KnowledgeEntryForm } from "@/components/knowledge/KnowledgeEntryForm"
import { cn } from "@/lib/utils"
import {
  Search,
  Plus,
  FileText,
  Trash2,
  PenLine,
  Upload,
  MessageSquarePlus,
  X,
} from "lucide-react"

export function KnowledgePanel() {
  const { entries, isLoading, loadEntries, removeEntry } = useKnowledgeStore()
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const filtered = entries.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.content.toLowerCase().includes(search.toLowerCase()) ||
      (typeof e.tags === "string" ? e.tags : "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索知识库..."
            className="pl-9 bg-bg-elevated/60 text-xs h-8"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Upload className="h-3 w-3" /> 导入 MD
        </Button>
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowForm(true)}>
          <Plus className="h-3 w-3" /> 新建
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <MessageSquarePlus className="h-3 w-3" /> AI 录入
        </Button>
      </div>

      {isLoading && entries.length === 0 ? (
        <p className="text-xs text-text-tertiary text-center py-12">加载中...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-text-tertiary text-center py-12">
          {entries.length === 0 ? "暂无知识条目，点击「新建」创建第一条" : "无匹配结果"}
        </p>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-280px)]">
          <div className="space-y-2">
            {filtered.map((entry) => {
              const tags: string[] = (() => {
                try { return JSON.parse(typeof entry.tags === "string" ? entry.tags : "[]") }
                catch { return [] }
              })()
              return (
                <div
                  key={entry.id}
                  className="group flex items-center justify-between p-3 rounded-xl border border-border bg-bg-elevated/50 transition-all duration-200 hover:border-accent-dev/20 hover:bg-bg-hover/20 cursor-pointer"
                  onClick={() => setEditingId(entry.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-dev/10">
                      <FileText className="h-4 w-4 text-accent-dev" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{entry.title}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-bg-hover/40 text-text-tertiary">
                            {tag}
                          </span>
                        ))}
                        <span className="text-[9px] text-text-tertiary">
                          {new Date(entry.updated_at).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-text-tertiary hover:text-accent-dev"
                      onClick={(e) => { e.stopPropagation(); setEditingId(entry.id) }}
                    >
                      <PenLine className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-text-tertiary hover:text-danger"
                      onClick={(e) => { e.stopPropagation(); removeEntry(entry.id) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}

      {/* Create dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建知识条目</DialogTitle>
          </DialogHeader>
          <KnowledgeEntryForm onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingId} onOpenChange={(v) => { if (!v) setEditingId(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑知识条目</DialogTitle>
          </DialogHeader>
          {editingId && (
            <KnowledgeEntryForm
              entry={entries.find((e) => e.id === editingId)}
              onClose={() => setEditingId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
