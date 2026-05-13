import { create } from 'zustand'
import { gitIpc } from '@/lib/ipc'
import type { GitStatus } from '@/types/commands'

interface GitState {
  status: GitStatus | null
  diff: string
  loading: boolean
  error: string | null

  loadStatus: (repoPath: string) => Promise<void>
  loadDiff: (repoPath: string, staged?: boolean) => Promise<void>
  clear: () => void
}

export const useGitStore = create<GitState>((set) => ({
  status: null,
  diff: '',
  loading: false,
  error: null,

  loadStatus: async (repoPath) => {
    set({ loading: true, error: null })
    try {
      const status = await gitIpc.status(repoPath)
      set({ status, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  loadDiff: async (repoPath, staged) => {
    set({ loading: true, error: null })
    try {
      const diff = await gitIpc.diff(repoPath, staged)
      set({ diff, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  clear: () => set({ status: null, diff: '', error: null }),
}))
