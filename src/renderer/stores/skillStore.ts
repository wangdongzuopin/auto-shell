import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  mode: 'companion' | 'work' | 'decision' | 'reflection';
  enabled: boolean;
  createdAt: number;
}

interface SkillState {
  skills: Skill[];
  activeSkillId: string | null;
  loadedFromDisk: boolean;

  addSkill: (skill: Omit<Skill, 'id' | 'createdAt'>) => Skill;
  updateSkill: (id: string, updates: Partial<Skill>) => void;
  deleteSkill: (id: string) => void;
  setActiveSkill: (id: string | null) => void;
  getActiveSkill: () => Skill | undefined;
  importSkill: (skillData: { name: string; description: string; icon: string; path: string; mode?: Skill['mode'] }) => Skill;
  loadSkillsFromDisk: () => Promise<void>;
  refreshSkills: () => Promise<void>;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useSkillStore = create<SkillState>()(
  persist(
    (set, get) => ({
      skills: [
        {
          id: 'code-assistant',
          name: '代码助手',
          description: '帮你写代码、调试、审查代码',
          icon: '💻',
          path: '',
          mode: 'work',
          enabled: true,
          createdAt: Date.now(),
        },
        {
          id: 'writing-assistant',
          name: '写作助手',
          description: '帮你写作、翻译、润色文章',
          icon: '📝',
          path: '',
          mode: 'companion',
          enabled: true,
          createdAt: Date.now(),
        },
        {
          id: 'search-assistant',
          name: '搜索助手',
          description: '帮你搜索信息、分析数据',
          icon: '🔍',
          path: '',
          mode: 'work',
          enabled: true,
          createdAt: Date.now(),
        },
      ],
      activeSkillId: null,
      loadedFromDisk: false,

      addSkill: (skillData) => {
        const newSkill: Skill = {
          ...skillData,
          id: generateId(),
          createdAt: Date.now(),
        };
        set((state) => ({ skills: [...state.skills, newSkill] }));
        return newSkill;
      },

      updateSkill: (id, updates) => set((state) => ({
        skills: state.skills.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      })),

      deleteSkill: (id) => set((state) => ({
        skills: state.skills.filter((s) => s.id !== id),
        activeSkillId: state.activeSkillId === id ? null : state.activeSkillId,
      })),

      setActiveSkill: (id) => set({ activeSkillId: id }),

      getActiveSkill: () => {
        const state = get();
        return state.skills.find((s) => s.id === state.activeSkillId);
      },

      importSkill: (skillData) => {
        const newSkill: Skill = {
          ...skillData,
          id: generateId(),
          mode: skillData.mode || 'work',
          enabled: true,
          createdAt: Date.now(),
        };
        set((state) => ({ skills: [...state.skills, newSkill] }));
        return newSkill;
      },

      loadSkillsFromDisk: async () => {
        try {
          const diskSkills = await window.api.getSkillsFromDisk();
          if (diskSkills && diskSkills.length > 0) {
            const existingIds = new Set(get().skills.map((s) => s.id));
            const newSkills = diskSkills.filter((ds: Skill) => !existingIds.has(ds.id));
            if (newSkills.length > 0) {
              set((state) => ({
                skills: [...state.skills, ...newSkills],
                loadedFromDisk: true,
              }));
            }
          }
        } catch (error) {
          console.error('Failed to load skills from disk:', error);
        }
      },

      refreshSkills: async () => {
        await get().loadSkillsFromDisk();
      },
    }),
    {
      name: 'skill-storage',
    }
  )
);
