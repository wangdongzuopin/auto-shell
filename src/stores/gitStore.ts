import { create } from 'zustand'
import { gitIpc } from '@/lib/ipc'
import type { GitCommitSuggestion, GitStatus } from '@/types/commands'

interface GitState {
  status: GitStatus | null
  diff: string
  commitSuggestion: GitCommitSuggestion | null
  loading: boolean
  error: string | null

  loadStatus: (repoPath: string) => Promise<void>
  loadDiff: (repoPath: string, staged?: boolean) => Promise<void>
  loadCommitSuggestion: (repoPath: string) => Promise<void>
  clear: () => void
}

export const useGitStore = create<GitState>((set) => ({
  status: null,
  diff: '',
  commitSuggestion: null,
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

  loadCommitSuggestion: async (repoPath) => {
    set({ loading: true, error: null })
    try {
      const commitSuggestion = await gitIpc.commitSuggestion(repoPath)
      set({ commitSuggestion, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  clear: () => set({ status: null, diff: '', commitSuggestion: null, error: null }),
}))
