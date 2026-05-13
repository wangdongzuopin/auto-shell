// ===== IPC Command Request/Response Types for pizz =====

// --- Project ---
export interface Project {
  id: string
  name: string
  description: string
  path: string
  created_at: number
  updated_at: number
}

export interface CreateProjectPayload {
  name: string
  path: string
  description?: string
}

export interface UpdateProjectPayload {
  id: string
  name?: string
  description?: string
}

// --- Conversation ---
export interface Conversation {
  id: string
  project_id: string
  title: string
  mode: string
  created_at: number
  updated_at: number
}

export interface CreateConversationPayload {
  project_id: string
  title?: string
  mode?: string
}

// --- Message ---
export interface Message {
  id: string
  conversation_id: string
  role: string
  content: string
  timestamp: number
  metadata: string
}

export interface AddMessagePayload {
  conversation_id: string
  role: string
  content: string
  metadata?: string
}

// --- File ---
export interface FileContent {
  path: string
  content: string
  hash: string
  size: number
}

export interface DirEntry {
  name: string
  path: string
  is_dir: boolean
  size: number
}

export interface DirectoryListing {
  path: string
  entries: DirEntry[]
}

// --- Knowledge ---
export interface KnowledgeEntry {
  id: string
  title: string
  content: string
  tags: string
  source: string
  project_id: string | null
  created_at: number
  updated_at: number
}

export interface CreateKnowledgePayload {
  title: string
  content: string
  tags?: string[]
  source?: string
  project_id?: string | null
}

export interface UpdateKnowledgePayload {
  id: string
  title?: string
  content?: string
  tags?: string[]
}

// --- Skill ---
export interface Skill {
  id: string
  name: string
  description: string
  content: string
  skill_type: string
  category: string
  role: string
  enabled: boolean
  created_at: number
}

export interface CreateSkillPayload {
  name: string
  description: string
  content: string
  skill_type?: string
  category?: string
  role?: string
}

export interface UpdateSkillPayload {
  id: string
  name?: string
  description?: string
  content?: string
  category?: string
}

// --- Search ---
export interface SearchResult {
  path: string
  snippet: string
}

// --- AI / Tool Stream ---
export interface ToolCall {
  id: string
  name: string
  arguments: string
}

export type StreamEvent =
  | { type: 'TextDelta'; data: string }
  | { type: 'ToolCallStarted'; data: { id: string; name: string; arguments: string } }
  | { type: 'ToolCallCompleted'; data: { id: string; name: string; result: string; success: boolean } }
  | { type: 'ConversationCompressed'; data: { summary: string; dropped_count: number } }
  | { type: 'Error'; data: string }
  | { type: 'Done' }

// --- Git ---
export interface GitStatus {
  branch: string
  clean: boolean
  files: GitFileStatus[]
  ahead: number
  behind: number
  recent_commits: GitCommit[]
}

export interface GitFileStatus {
  path: string
  status: string
  staged: boolean
}

export interface GitCommit {
  hash: string
  message: string
  author: string
  date: string
}

// --- Checkpoint ---
export interface FileCheckpoint {
  id: string
  file_path: string
  old_hash: string
  old_content: string
  conversation_id: string
  created_at: string
}

// --- Terminal ---
export type TerminalEvent =
  | { type: 'Output'; data: string }
  | { type: 'Exit'; data: number }

// --- MCP ---
export type McpServerStatus = 'Disconnected' | 'Connecting' | 'Connected' | 'Error'

export interface McpServerConfig {
  id: string
  name: string
  command: string
  args: string[]
  enabled: boolean
  transport_type: string
}

export interface McpTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface McpServerInfo {
  config: McpServerConfig
  status: McpServerStatus
  tools: McpTool[]
  error_message?: string | null
}
