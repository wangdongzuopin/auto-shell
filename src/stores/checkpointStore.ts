import { create } from 'zustand'
import { undoIpc } from '@/lib/ipc'
import type { FileCheckpoint } from '@/types/commands'

interface CheckpointState {
  checkpoints: FileCheckpoint[]
  loading: boolean
  error: string | null

  loadCheckpoints: (conversationId: string) => Promise<void>
  undoLastEdit: (filePath: string, conversationId: string) => Promise<void>
  clearCheckpoints: (conversationId: string) => Promise<void>
}

export const useCheckpointStore = create<CheckpointState>((set, get) => ({
  checkpoints: [],
  loading: false,
  error: null,

  loadCheckpoints: async (conversationId) => {
    set({ loading: true, error: null })
    try {
      const checkpoints = await undoIpc.listCheckpoints(conversationId)
      set({ checkpoints, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  undoLastEdit: async (filePath, conversationId) => {
    set({ loading: true, error: null })
    try {
      await undoIpc.undoLastEdit(filePath, conversationId)
      // Reload after undo
      await get().loadCheckpoints(conversationId)
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  clearCheckpoints: async (conversationId) => {
    try {
      await undoIpc.clearCheckpoints(conversationId)
      set({ checkpoints: [] })
    } catch (e) {
      set({ error: String(e) })
    }
  },
}))
