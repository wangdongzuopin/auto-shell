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
  enabled: boolean
  created_at: number
}

export interface CreateSkillPayload {
  name: string
  description: string
  content: string
  skill_type?: string
  category?: string
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
  | { type: 'ToolCallCompleted'; data: { id: string; result: string; success: boolean } }
  | { type: 'Error'; data: string }
  | { type: 'Done' }
