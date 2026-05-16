import { create } from 'zustand'
import { workflowIpc } from '@/lib/ipc'
import type {
  Artifact,
  CreateArtifactPayload,
  CreateIdeaPayload,
  CreateWorkspacePayload,
  Idea,
  RoleProfile,
  UpdateIdeaStatusPayload,
  Workspace,
} from '@/types/commands'

interface WorkflowState {
  workspaces: Workspace[]
  roleProfiles: RoleProfile[]
  ideas: Idea[]
  artifactsByIdea: Record<string, Artifact[]>
  currentWorkspaceId: string | null
  currentIdeaId: string | null
  isLoading: boolean
  error: string | null

  loadWorkspaces: () => Promise<void>
  createWorkspace: (payload: CreateWorkspacePayload) => Promise<Workspace>
  setCurrentWorkspace: (workspaceId: string | null) => void
  loadRoleProfiles: (workspaceId?: string | null) => Promise<void>
  loadIdeas: (workspaceId?: string | null, projectId?: string | null) => Promise<void>
  createIdea: (payload: CreateIdeaPayload) => Promise<Idea>
  updateIdeaStatus: (payload: UpdateIdeaStatusPayload) => Promise<Idea>
  setCurrentIdea: (ideaId: string | null) => void
  loadArtifacts: (ideaId: string) => Promise<void>
  createArtifact: (payload: CreateArtifactPayload) => Promise<Artifact>
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workspaces: [],
  roleProfiles: [],
  ideas: [],
  artifactsByIdea: {},
  currentWorkspaceId: null,
  currentIdeaId: null,
  isLoading: false,
  error: null,

  loadWorkspaces: async () => {
    set({ isLoading: true, error: null })
    try {
      const workspaces = await workflowIpc.listWorkspaces()
      set({ workspaces, isLoading: false })
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  createWorkspace: async (payload) => {
    const workspace = await workflowIpc.createWorkspace(payload)
    set((s) => ({
      workspaces: [workspace, ...s.workspaces.filter((w) => w.id !== workspace.id)],
      currentWorkspaceId: workspace.id,
    }))
    return workspace
  },

  setCurrentWorkspace: (workspaceId) => set({ currentWorkspaceId: workspaceId }),

  loadRoleProfiles: async (workspaceId = get().currentWorkspaceId) => {
    set({ isLoading: true, error: null })
    try {
      const roleProfiles = await workflowIpc.listRoleProfiles(workspaceId)
      set({ roleProfiles, isLoading: false })
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  loadIdeas: async (workspaceId = get().currentWorkspaceId, projectId) => {
    set({ isLoading: true, error: null })
    try {
      const ideas = await workflowIpc.listIdeas(workspaceId, projectId)
      set({ ideas, isLoading: false })
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  createIdea: async (payload) => {
    const idea = await workflowIpc.createIdea(payload)
    set((s) => ({
      ideas: [idea, ...s.ideas.filter((item) => item.id !== idea.id)],
      currentIdeaId: idea.id,
    }))
    return idea
  },

  updateIdeaStatus: async (payload) => {
    const idea = await workflowIpc.updateIdeaStatus(payload)
    set((s) => ({
      ideas: s.ideas.map((item) => (item.id === idea.id ? idea : item)),
      currentIdeaId: idea.id,
    }))
    return idea
  },

  setCurrentIdea: (ideaId) => set({ currentIdeaId: ideaId }),

  loadArtifacts: async (ideaId) => {
    set({ isLoading: true, error: null })
    try {
      const artifacts = await workflowIpc.listArtifacts(ideaId)
      set((s) => ({
        artifactsByIdea: { ...s.artifactsByIdea, [ideaId]: artifacts },
        isLoading: false,
      }))
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  createArtifact: async (payload) => {
    const artifact = await workflowIpc.createArtifact(payload)
    set((s) => {
      const existing = s.artifactsByIdea[artifact.idea_id] ?? []
      return {
        artifactsByIdea: {
          ...s.artifactsByIdea,
          [artifact.idea_id]: [
            artifact,
            ...existing.filter((item) => item.id !== artifact.id),
          ],
        },
      }
    })
    return artifact
  },
}))
