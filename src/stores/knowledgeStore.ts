import { create } from 'zustand'
import type { KnowledgeEntry } from '@/types/commands'
import { knowledgeIpc } from '@/lib/ipc'

interface KnowledgeState {
  entries: KnowledgeEntry[]
  isLoading: boolean
  error: string | null

  loadEntries: () => Promise<void>
  addEntry: (title: string, content: string, tags?: string[], projectId?: string) => Promise<void>
  updateEntry: (id: string, fields: { title?: string; content?: string; tags?: string[] }) => Promise<void>
  removeEntry: (id: string) => Promise<void>
  searchEntries: (query: string) => Promise<KnowledgeEntry[]>
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,

  loadEntries: async () => {
    set({ isLoading: true, error: null })
    try {
      const entries = await knowledgeIpc.list()
      set({ entries, isLoading: false })
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load', isLoading: false })
    }
  },

  addEntry: async (title, content, tags, projectId) => {
    const entry = await knowledgeIpc.create({
      title,
      content,
      tags: tags || [],
      source: 'manual',
      project_id: projectId || null,
    })
    set((s) => ({ entries: [entry, ...s.entries] }))
  },

  updateEntry: async (id, fields) => {
    const updated = await knowledgeIpc.update({ id, ...fields })
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? updated : e)),
    }))
  },

  removeEntry: async (id) => {
    await knowledgeIpc.delete(id)
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }))
  },

  searchEntries: async (query) => {
    return knowledgeIpc.search(query)
  },
}))
