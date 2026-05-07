import { useState, useEffect } from "react"
import { useSkillStore } from "@/stores/skillStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SkillEditor } from "@/components/skills/SkillEditor"
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

const defaultCategories = ["全部", "开发", "产品", "安全"]

export function SkillsPanel() {
  const { skills, isLoading, loadSkills, removeSkill, toggleSkill } = useSkillStore()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("全部")
  const [showForm, setShowForm] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  const filtered = skills.filter((s) => {
    const matchCat = category === "全部" || s.category === category
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const IconFor = (cat: string) => categoryIcons[cat] || Code2

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
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Upload className="h-3 w-3" /> 导入
        </Button>
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowForm(true)}>
          <Plus className="h-3 w-3" /> 新建
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <MessageSquarePlus className="h-3 w-3" /> AI 生成
        </Button>
      </div>

      <div className="flex items-center gap-1 mt-3">
        {defaultCategories.map((cat) => (
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
                  className="group flex items-start gap-3 p-3 rounded-xl border border-border bg-bg-elevated/50 transition-all duration-200 hover:border-accent-dev/20 hover:bg-bg-hover/20 cursor-pointer"
                  onClick={() => setEditingSkill(skill)}
                >
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
                      {skill.enabled ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary/30" />
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">{skill.description}</p>
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
    </>
  )
}
