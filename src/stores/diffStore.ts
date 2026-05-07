import { create } from "zustand";

export interface DiffEntry {
  id: string
  path: string
  content: string
  operation: "add" | "modify" | "delete"
  timestamp: number
  conversationId: string
}

interface DiffState {
  diffs: DiffEntry[]
  addDiff: (diff: Omit<DiffEntry, "id" | "timestamp">) => void
  clearDiffs: (conversationId?: string) => void
  getByConversation: (conversationId: string) => DiffEntry[]
}

export const useDiffStore = create<DiffState>((set, get) => ({
  diffs: [],

  addDiff: (diff) =>
    set((s) => ({
      diffs: [
        ...s.diffs,
        {
          ...diff,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
      ],
    })),

  clearDiffs: (conversationId) =>
    set((s) => ({
      diffs: conversationId
        ? s.diffs.filter((d) => d.conversationId !== conversationId)
        : [],
    })),

  getByConversation: (conversationId) =>
    get().diffs.filter((d) => d.conversationId === conversationId),
}));
