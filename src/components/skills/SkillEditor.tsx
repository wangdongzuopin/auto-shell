import { useState } from "react"
import { useSkillStore } from "@/stores/skillStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Skill } from "@/types/commands"

interface Props {
  skill?: Skill
  onClose: () => void
}

const skillTypes = [
  { value: "builtin", label: "内置" },
  { value: "imported", label: "导入" },
  { value: "ai-generated", label: "AI 生成" },
]

const categories = ["开发", "产品", "安全", "测试", "架构", "数据库", "工具", "通用"]

export function SkillEditor({ skill, onClose }: Props) {
  const { addSkill, updateSkill } = useSkillStore()
  const [name, setName] = useState(skill?.name || "")
  const [description, setDescription] = useState(skill?.description || "")
  const [content, setContent] = useState(skill?.content || "")
  const [skillType, setSkillType] = useState(skill?.skill_type || "imported")
  const [category, setCategory] = useState(skill?.category || "通用")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (skill) {
        await updateSkill(skill.id, {
          name: name.trim(),
          description,
          content,
          category,
        })
      } else {
        await addSkill(name.trim(), description, content, skillType, category)
      }
      onClose()
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  const inputClass = cn(
    "w-full px-3 py-2 rounded-lg border text-xs",
    "bg-bg-elevated/60 text-text-primary placeholder:text-text-tertiary",
    "border-border/50 focus:border-accent-dev/30 focus:outline-none focus:ring-1 focus:ring-accent-dev/20",
    "transition-all duration-200"
  )

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">名称</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="技能名称..."
          className={cn(inputClass, "mt-1")}
        />
      </div>

      <div>
        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">描述</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="简要描述..."
          className={cn(inputClass, "mt-1")}
        />
      </div>

      <div>
        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">提示词 / 指令</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="编写技能的系统提示词..."
          rows={5}
          className={cn(inputClass, "mt-1 resize-none")}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">类型</label>
          <div className="flex gap-1 mt-1">
            {skillTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => setSkillType(t.value)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200",
                  skillType === t.value
                    ? "bg-accent-dev/10 text-accent-dev"
                    : "text-text-tertiary hover:text-text-secondary bg-bg-elevated/30"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">分类</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={cn(inputClass, "mt-1")}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
          取消
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!name.trim() || saving} className="text-xs">
          {saving ? "保存中..." : skill ? "更新" : "创建"}
        </Button>
      </div>
    </div>
  )
}
