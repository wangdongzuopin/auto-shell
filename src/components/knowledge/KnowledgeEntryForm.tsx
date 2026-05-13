import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useKnowledgeStore } from "@/stores/knowledgeStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import type { KnowledgeEntry } from "@/types/commands"

interface Props {
  entry?: KnowledgeEntry
  onClose: () => void
}

export function KnowledgeEntryForm({ entry, onClose }: Props) {
  const { t } = useTranslation();
  const { addEntry, updateEntry } = useKnowledgeStore()
  const [title, setTitle] = useState(entry?.title || "")
  const [content, setContent] = useState(entry?.content || "")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>(() => {
    if (!entry?.tags) return []
    try { return JSON.parse(typeof entry.tags === "string" ? entry.tags : "[]") }
    catch { return [] }
  })
  const [saving, setSaving] = useState(false)

  const handleAddTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setTagInput("")
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      if (entry) {
        await updateEntry(entry.id, { title: title.trim(), content, tags })
      } else {
        await addEntry(title.trim(), content, tags)
      }
      onClose()
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{t("knowledge.entryTitle")}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("knowledge.titlePlaceholder")}
          className={cn(
            "w-full mt-1 px-3 py-2 rounded-lg border text-xs",
            "bg-bg-elevated/60 text-text-primary placeholder:text-text-tertiary",
            "border-border/50 focus:border-accent-dev/30 focus:outline-none focus:ring-1 focus:ring-accent-dev/20",
            "transition-all duration-200"
          )}
        />
      </div>

      <div>
        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{t("knowledge.entryContent")}</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("knowledge.contentPlaceholder")}
          rows={6}
          className={cn(
            "w-full mt-1 px-3 py-2 rounded-lg border text-xs resize-none",
            "bg-bg-elevated/60 text-text-primary placeholder:text-text-tertiary",
            "border-border/50 focus:border-accent-dev/30 focus:outline-none focus:ring-1 focus:ring-accent-dev/20",
            "transition-all duration-200"
          )}
        />
      </div>

      <div>
        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{t("knowledge.tags")}</label>
        <div className="flex items-center gap-1.5 mt-1">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag() } }}
            placeholder={t("knowledge.tagPlaceholder")}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg border text-xs",
              "bg-bg-elevated/60 text-text-primary placeholder:text-text-tertiary",
              "border-border/50 focus:border-accent-dev/30 focus:outline-none focus:ring-1 focus:ring-accent-dev/20",
              "transition-all duration-200"
            )}
          />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-accent-dev/10 text-accent-dev"
              >
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="hover:text-danger">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
          {t("common.cancel")}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!title.trim() || saving} className="text-xs">
          {saving ? t("knowledge.saving") : entry ? t("knowledge.update") : t("knowledge.create")}
        </Button>
      </div>
    </div>
  )
}
