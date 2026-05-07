import { create } from "zustand"
import type { Skill } from "@/types/commands"
import { skillIpc } from "@/lib/ipc"

interface SkillState {
  skills: Skill[]
  isLoading: boolean
  error: string | null

  loadSkills: () => Promise<void>
  addSkill: (name: string, description: string, content: string, skillType?: string, category?: string, role?: string) => Promise<void>
  updateSkill: (id: string, fields: { name?: string; description?: string; content?: string; category?: string; role?: string }) => Promise<void>
  toggleSkill: (id: string) => Promise<void>
  removeSkill: (id: string) => Promise<void>
}

export const useSkillStore = create<SkillState>((set, get) => ({
  skills: [],
  isLoading: false,
  error: null,

  loadSkills: async () => {
    set({ isLoading: true, error: null })
    try {
      const skills = await skillIpc.list()
      set({ skills, isLoading: false })
    } catch (e: any) {
      set({ error: e?.message || "Failed to load", isLoading: false })
    }
  },

  addSkill: async (name, description, content, skillType, category, role) => {
    const skill = await skillIpc.create({
      name,
      description,
      content,
      skill_type: skillType || "imported",
      category: category || "通用",
      role: role || "both",
    })
    set((s) => ({ skills: [skill, ...s.skills] }))
  },

  updateSkill: async (id, fields) => {
    const updated = await skillIpc.update({ id, ...fields })
    set((s) => ({
      skills: s.skills.map((sk) => (sk.id === id ? updated : sk)),
    }))
  },

  toggleSkill: async (id) => {
    const updated = await skillIpc.toggle(id)
    set((s) => ({
      skills: s.skills.map((sk) => (sk.id === id ? updated : sk)),
    }))
  },

  removeSkill: async (id) => {
    await skillIpc.delete(id)
    set((s) => ({ skills: s.skills.filter((sk) => sk.id !== id) }))
  },
}))
