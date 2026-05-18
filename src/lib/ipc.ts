import { invoke, Channel } from '@tauri-apps/api/core'
import type {
  Project, CreateProjectPayload, UpdateProjectPayload,
  Conversation, CreateConversationPayload,
  Message, AddMessagePayload,
  FileContent, DirectoryListing,
  KnowledgeEntry, CreateKnowledgePayload, UpdateKnowledgePayload,
  Skill, CreateSkillPayload, UpdateSkillPayload,
  SearchResult,
  McpServerConfig, McpServerInfo, McpTool,
  TerminalEvent,
  GitStatus, GitCommit, GitCommitSuggestion,
  FileCheckpoint,
  Workspace, CreateWorkspacePayload,
  RoleProfile,
  Idea, CreateIdeaPayload, UpdateIdeaStatusPayload,
  Artifact, CreateArtifactPayload,
} from '@/types/commands'

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}

function browserSettingKey(key: string) {
  return `pizz.setting.${key}`
}

function browserDataKey(key: string) {
  return `pizz.browser.${key}`
}

function genBrowserId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function readBrowserJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(browserDataKey(key))
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeBrowserJson<T>(key: string, value: T) {
  localStorage.setItem(browserDataKey(key), JSON.stringify(value))
}

function call<T>(command: string, args?: Record<string, unknown>, browserFallback?: () => T): Promise<T> {
  if (!isTauriRuntime()) {
    if (browserFallback) return Promise.resolve(browserFallback())
    return Promise.reject(new Error(`Tauri command "${command}" is unavailable in browser preview.`))
  }
  return invoke<T>(command, args)
}

// ===== Projects =====
export const projectIpc = {
  list: () => call<Project[]>('list_projects', undefined, () => []),
  get: (id: string) => invoke<Project>('get_project', { id }),
  create: (payload: CreateProjectPayload) => invoke<Project>('create_project', { payload }),
  update: (payload: UpdateProjectPayload) => invoke<Project>('update_project', { payload }),
  delete: (id: string) => invoke<void>('delete_project', { id }),
}

// ===== Files =====
export const fileIpc = {
  read: (path: string) => invoke<FileContent>('read_file', { path }),
  write: (path: string, content: string) => invoke<void>('write_file', { path, content }),
  listDir: (path: string) => invoke<DirectoryListing>('list_directory', { path }),
  search: (query: string, projectId?: string) => invoke<SearchResult[]>('search_files', { query, projectId }),
}

// ===== Conversations =====
export const chatIpc = {
  listConversations: (projectId: string) => invoke<Conversation[]>('list_conversations', { projectId }),
  createConversation: (payload: CreateConversationPayload) => invoke<Conversation>('create_conversation', { payload }),
  deleteConversation: (id: string) => invoke<void>('delete_conversation', { id }),
  listMessages: (conversationId: string) => invoke<Message[]>('list_messages', { conversationId }),
  addMessage: (payload: AddMessagePayload) => invoke<Message>('add_message', { payload }),
}

// ===== Knowledge =====
export const knowledgeIpc = {
  list: () => invoke<KnowledgeEntry[]>('list_knowledge'),
  get: (id: string) => invoke<KnowledgeEntry>('get_knowledge', { id }),
  create: (payload: CreateKnowledgePayload) => invoke<KnowledgeEntry>('create_knowledge', { payload }),
  update: (payload: UpdateKnowledgePayload) => invoke<KnowledgeEntry>('update_knowledge', { payload }),
  delete: (id: string) => invoke<void>('delete_knowledge', { id }),
  search: (query: string) => invoke<KnowledgeEntry[]>('search_knowledge', { query }),
}

// ===== Skills =====
export const skillIpc = {
  list: () => invoke<Skill[]>('list_skills'),
  listEnabled: () => invoke<Skill[]>('list_enabled_skills'),
  get: (id: string) => invoke<Skill>('get_skill', { id }),
  create: (payload: CreateSkillPayload) => invoke<Skill>('create_skill', { payload }),
  update: (payload: UpdateSkillPayload) => invoke<Skill>('update_skill', { payload }),
  toggle: (id: string) => invoke<Skill>('toggle_skill', { id }),
  delete: (id: string) => invoke<void>('delete_skill', { id }),
}

// ===== Settings =====
export const settingsIpc = {
  get: (key: string) =>
    call<string | null>('get_setting', { key }, () => localStorage.getItem(browserSettingKey(key))),
  set: (key: string, value: string) =>
    call<void>('set_setting', { key, value }, () => {
      localStorage.setItem(browserSettingKey(key), value)
    }),
}

// ===== Terminal =====
export const terminalIpc = {
  spawn: (channel: Channel<TerminalEvent>, cwd?: string, shell?: string) =>
    invoke<string>('terminal_spawn', { channel, cwd, shell }),
  write: (sessionId: string, data: string) =>
    invoke<void>('terminal_write', { sessionId, data }),
  resize: (sessionId: string, cols: number, rows: number) =>
    invoke<void>('terminal_resize', { sessionId, cols, rows }),
  kill: (sessionId: string) =>
    invoke<void>('terminal_kill', { sessionId }),
}

// ===== MCP =====
export const mcpIpc = {
  listServers: () => invoke<McpServerInfo[]>('list_mcp_servers'),
  addServer: (config: McpServerConfig) => invoke<McpServerInfo>('add_mcp_server', { config }),
  removeServer: (serverId: string) => invoke<void>('remove_mcp_server', { serverId }),
  startServer: (serverId: string) => invoke<McpServerInfo>('start_mcp_server', { serverId }),
  stopServer: (serverId: string) => invoke<void>('stop_mcp_server', { serverId }),
  getTools: () => invoke<McpTool[]>('get_mcp_tools'),
  reconnectAll: () => invoke<McpServerInfo[]>('reconnect_mcp_servers'),
}

// ===== Git =====
export const gitIpc = {
  status: (repoPath: string) => invoke<GitStatus>('git_status', { repoPath }),
  diff: (repoPath: string, staged?: boolean) => invoke<string>('git_diff', { repoPath, staged: staged ?? false }),
  log: (repoPath: string, count?: number) => invoke<GitCommit[]>('git_log', { repoPath, count: count ?? 10 }),
  commitSuggestion: (repoPath: string) =>
    invoke<GitCommitSuggestion>('git_commit_suggestion', { repoPath }),
}

// ===== Undo =====
export const undoIpc = {
  undoLastEdit: (filePath: string, conversationId: string) => invoke<string>('undo_last_edit', { filePath, conversationId }),
  listCheckpoints: (conversationId: string) => invoke<FileCheckpoint[]>('list_checkpoints', { conversationId }),
  clearCheckpoints: (conversationId: string) => invoke<void>('clear_checkpoints', { conversationId }),
}

// ===== Team Workflow =====
export const workflowIpc = {
  listWorkspaces: () => call<Workspace[]>('list_workspaces', undefined, () => readBrowserJson('workspaces', [])),
  createWorkspace: (payload: CreateWorkspacePayload) =>
    call<Workspace>('create_workspace', { payload }, () => {
      const now = Date.now()
      const workspace: Workspace = {
        id: genBrowserId('workspace'),
        name: payload.name,
        description: payload.description ?? '',
        owner_account_id: payload.owner_account_id ?? null,
        edition: payload.edition ?? 'team',
        created_at: now,
        updated_at: now,
      }
      const workspaces = [workspace, ...readBrowserJson<Workspace[]>('workspaces', [])]
      writeBrowserJson('workspaces', workspaces)
      return workspace
    }),
  listRoleProfiles: (workspaceId?: string | null) =>
    call<RoleProfile[]>('list_role_profiles', { workspaceId }, () => []),
  listIdeas: (workspaceId?: string | null, projectId?: string | null) =>
    call<Idea[]>('list_ideas', { workspaceId, projectId }, () =>
      readBrowserJson<Idea[]>('ideas', []).filter((idea) => {
        if (workspaceId && idea.workspace_id !== workspaceId) return false
        if (projectId && idea.project_id !== projectId) return false
        return true
      })
    ),
  createIdea: (payload: CreateIdeaPayload) =>
    call<Idea>('create_idea', { payload }, () => {
      const now = Date.now()
      const idea: Idea = {
        id: genBrowserId('idea'),
        workspace_id: payload.workspace_id ?? null,
        project_id: payload.project_id ?? null,
        title: payload.title,
        content: payload.content,
        source_role_key: payload.source_role_key ?? 'product_management',
        status: 'submitted',
        assessment_summary: '',
        current_role_key: payload.source_role_key ?? 'product_management',
        next_role_key: 'feasibility_assessment',
        created_by_account_id: payload.created_by_account_id ?? null,
        created_at: now,
        updated_at: now,
      }
      const ideas = [idea, ...readBrowserJson<Idea[]>('ideas', [])]
      writeBrowserJson('ideas', ideas)
      return idea
    }),
  updateIdeaStatus: (payload: UpdateIdeaStatusPayload) =>
    call<Idea>('update_idea_status', { payload }, () => {
      const ideas = readBrowserJson<Idea[]>('ideas', [])
      const existing = ideas.find((idea) => idea.id === payload.id)
      if (!existing) throw new Error(`Idea not found: ${payload.id}`)
      const updated: Idea = {
        ...existing,
        status: payload.status,
        assessment_summary: payload.assessment_summary ?? existing.assessment_summary,
        current_role_key: payload.current_role_key ?? existing.current_role_key,
        next_role_key: payload.next_role_key ?? existing.next_role_key,
        updated_at: Date.now(),
      }
      writeBrowserJson('ideas', ideas.map((idea) => (idea.id === updated.id ? updated : idea)))
      return updated
    }),
  listArtifacts: (ideaId: string) =>
    call<Artifact[]>('list_artifacts', { ideaId }, () =>
      readBrowserJson<Artifact[]>('artifacts', []).filter((artifact) => artifact.idea_id === ideaId)
    ),
  createArtifact: (payload: CreateArtifactPayload) =>
    call<Artifact>('create_artifact', { payload }, () => {
      const now = Date.now()
      const artifact: Artifact = {
        id: genBrowserId('artifact'),
        idea_id: payload.idea_id,
        artifact_type: payload.artifact_type,
        title: payload.title,
        content: payload.content,
        role_key: payload.role_key,
        status: payload.status ?? 'draft',
        created_by_account_id: payload.created_by_account_id ?? null,
        created_at: now,
        updated_at: now,
      }
      const artifacts = [artifact, ...readBrowserJson<Artifact[]>('artifacts', [])]
      writeBrowserJson('artifacts', artifacts)
      return artifact
    }),
}

// ===== All IPC =====
export const ipc = {
  projects: projectIpc,
  files: fileIpc,
  chat: chatIpc,
  knowledge: knowledgeIpc,
  skills: skillIpc,
  settings: settingsIpc,
  terminal: terminalIpc,
  mcp: mcpIpc,
  git: gitIpc,
  undo: undoIpc,
  workflow: workflowIpc,
}
