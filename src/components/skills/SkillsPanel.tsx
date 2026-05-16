import { useState, useEffect, useCallback } from "react"
import { useSkillStore } from "@/stores/skillStore"
import { useAppStore } from "@/stores/appStore"
import { useSettingsStore } from "@/stores/settingsStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SkillEditor } from "@/components/skills/SkillEditor"
import { streamChat } from "@/services/ai"
import { fileIpc } from "@/lib/ipc"
import { cn } from "@/lib/utils"
import {
  Search,
  Plus,
  Upload,
  MessageSquarePlus,
  X,
  Code2,
  Wrench,
  Shield,
  Layout,
  TestTube,
  Database,
  PenSquare,
  Trash2,
  Loader2,
} from "lucide-react"
import type { Skill } from "@/types/commands"

const categoryIcons: Record<string, typeof Code2> = {
  "开发": Code2,
  "产品": PenSquare,
  "安全": Shield,
  "测试": TestTube,
  "架构": Layout,
  "数据库": Database,
  "工具": Wrench,
}




export function SkillsPanel() {
  const { skills, isLoading, usageMap, loadSkills, addSkill, removeSkill, toggleSkill } = useSkillStore()
  const currentRole = useAppStore((s) => s.role)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("全部")
  const [showForm, setShowForm] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [showAiGen, setShowAiGen] = useState(false)
  const [aiGenPrompt, setAiGenPrompt] = useState("")
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiGenError, setAiGenError] = useState("")

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  const roleCategories = currentRole === "product"
    ? ["全部", "产品"]
    : ["全部", "开发", "产品", "安全"]

  const filtered = skills.filter((s) => {
    const matchCat = category === "全部" || s.category === category
    const matchRole = s.role === "both" || s.role === currentRole
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchRole && matchSearch
  })

  const IconFor = (cat: string) => categoryIcons[cat] || Code2

  // ── Import handler ──
  const handleImport = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog")
      const selected = await open({
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      })
      if (!selected) return

      const fileContent = await fileIpc.read(selected as string)
      const parsed = JSON.parse(fileContent.content)

      const items: Array<{ name: string; description: string; content: string; category?: string }> =
        Array.isArray(parsed) ? parsed : [parsed]

      for (const item of items) {
        if (item.name && item.content) {
          await addSkill(item.name, item.description || "", item.content, "imported", item.category || "通用")
        }
      }
      await loadSkills()
    } catch (err: any) {
      console.error("Import skills failed:", err)
      alert("导入失败: " + (err?.message || "未知错误"))
    }
  }, [addSkill, loadSkills])

  // ── AI Generate handler ──
  const handleAiGenerate = useCallback(async () => {
    if (!aiGenPrompt.trim()) return
    setAiGenerating(true)
    setAiGenError("")

    const aiConfig = useSettingsStore.getState().getAIConfig()
    if (!aiConfig.apiKey) {
      setAiGenError("请先在 AI 服务设置中配置 API Key")
      setAiGenerating(false)
      return
    }

    const systemPrompt = `你是一个技能生成器。根据用户的描述，生成一个结构化的 AI 技能。

输出格式必须是严格的 JSON（不要包含 markdown 代码块标记）：
{
  "name": "技能名称（简短，中文）",
  "description": "技能描述（一句话说明用途）",
  "content": "技能的系统提示词内容（详细指令，告诉 AI 如何执行该技能）",
  "category": "分类：开发/产品/安全/测试/架构/数据库/工具/通用"
}`

    let fullResponse = ""
    try {
      await streamChat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: aiGenPrompt },
        ],
        aiConfig,
        {
          onToken: () => {},
          onDone: (text) => {
            fullResponse = text
            try {
              // Strip markdown code fences if present
              const jsonStr = text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim()
              const parsed = JSON.parse(jsonStr)
              if (parsed.name && parsed.content) {
                addSkill(
                  parsed.name,
                  parsed.description || "",
                  parsed.content,
                  "ai-generated",
                  parsed.category || "通用"
                ).then(() => {
                  loadSkills()
                  setShowAiGen(false)
                  setAiGenPrompt("")
                })
              } else {
                setAiGenError("AI 返回的 JSON 缺少必要字段（name / content）")
              }
            } catch {
              setAiGenError("解析 AI 返回内容失败，请重试")
            }
            setAiGenerating(false)
          },
          onError: (err) => {
            setAiGenError(err.message)
            setAiGenerating(false)
          },
        }
      )
    } catch {
      setAiGenError("生成失败，请重试")
      setAiGenerating(false)
    }
  }, [aiGenPrompt, addSkill, loadSkills])

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (window.confirm("确定删除该技能？")) {
      removeSkill(id)
    }
  }

  const handleToggle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    toggleSkill(id)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索技能..."
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
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleImport}>
          <Upload className="h-3 w-3" /> 导入
        </Button>
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowForm(true)}>
          <Plus className="h-3 w-3" /> 新建
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowAiGen(true)}>
          <MessageSquarePlus className="h-3 w-3" /> AI 生成
        </Button>
      </div>

      <div className="flex items-center gap-1 mt-3">
        {roleCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200",
              category === cat
                ? "bg-accent-dev text-white"
                : "text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading && skills.length === 0 ? (
        <p className="text-xs text-text-tertiary text-center py-12">加载中...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-text-tertiary text-center py-12 mt-4">
          {skills.length === 0 ? "暂无技能，点击「新建」创建第一个" : "无匹配结果"}
        </p>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-340px)] mt-3">
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((skill) => {
              const Icon = IconFor(skill.category)
              return (
                <div
                  key={skill.id}
                  className="group flex items-start gap-3 p-3 rounded-xl border border-border bg-bg-elevated/50 transition-all duration-200 hover:border-accent-dev/20 hover:bg-bg-hover/20 cursor-pointer relative"
                  onClick={() => setEditingSkill(skill)}
                >
                  {/* Delete button — visible on hover */}
                  <button
                    onClick={(e) => handleDelete(e, skill.id)}
                    className="absolute top-2 right-2 p-1 rounded text-text-tertiary/40 hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>

                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    skill.skill_type === "builtin" ? "bg-accent-dev/10" : "bg-accent-pm/10"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      skill.skill_type === "builtin" ? "text-accent-dev" : "text-accent-pm"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-text-primary">{skill.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {skill.skill_type === "builtin" ? "内置" : skill.skill_type === "imported" ? "导入" : "AI"}
                      </Badge>
                      {skill.role !== "both" && (
                        <Badge variant="outline" className={cn(
                          "text-[9px] px-1 py-0",
                          skill.role === "developer" ? "text-accent-dev border-accent-dev/30" : "text-accent-pm border-accent-pm/30"
                        )}>
                          {skill.role === "developer" ? "开发" : "产品"}
                        </Badge>
                      )}
                      <button
                        onClick={(e) => handleToggle(e, skill.id)}
                        className="p-0.5 rounded-full hover:bg-bg-hover/40 transition-colors"
                        title={skill.enabled ? "已启用，点击禁用" : "已禁用，点击启用"}
                      >
                        {skill.enabled ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-success block" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary/30 block" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">{skill.description}</p>
                    {usageMap[skill.name] && (
                      <p className="text-[9px] text-text-tertiary mt-1">
                        使用 {usageMap[skill.name].count} 次
                      </p>
                    )}
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
            <DialogTitle>新建技能</DialogTitle>
          </DialogHeader>
          <SkillEditor onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingSkill} onOpenChange={(v) => { if (!v) setEditingSkill(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑技能</DialogTitle>
          </DialogHeader>
          {editingSkill && (
            <SkillEditor
              skill={editingSkill}
              onClose={() => setEditingSkill(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* AI Generate dialog */}
      <Dialog open={showAiGen} onOpenChange={(v) => { if (!v) { setShowAiGen(false); setAiGenError(""); setAiGenPrompt("") } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>AI 生成技能</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-text-secondary">
              描述你需要的技能，AI 将自动生成技能的名称、描述和提示词。
            </p>
            <textarea
              value={aiGenPrompt}
              onChange={(e) => setAiGenPrompt(e.target.value)}
              placeholder="例如：帮我写一个 React 组件代码审查技能，检查组件的性能、可访问性和代码规范..."
              rows={4}
              className={cn(
                "w-full px-3 py-2 rounded-lg border text-xs resize-none",
                "bg-bg-elevated/60 text-text-primary placeholder:text-text-tertiary",
                "border-border/50 focus:border-accent-dev/30 focus:outline-none focus:ring-1 focus:ring-accent-dev/20",
                "transition-all duration-200"
              )}
            />
            {aiGenError && (
              <p className="text-[11px] text-danger">{aiGenError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setShowAiGen(false); setAiGenError(""); setAiGenPrompt("") }}>
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleAiGenerate}
                disabled={!aiGenPrompt.trim() || aiGenerating}
                className="text-xs gap-1.5"
              >
                {aiGenerating ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> 生成中...</>
                ) : (
                  <><MessageSquarePlus className="h-3 w-3" /> 生成</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
