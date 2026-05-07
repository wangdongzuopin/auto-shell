// ===== Shared Types for pizz =====

// --- Role System ---
export type AppRole = 'developer' | 'product'

export interface AppUser {
  id: string
  name: string
  role: AppRole
  isEnterprise: boolean
}

// --- Project ---
export interface Project {
  id: string
  name: string
  description: string
  path: string
  createdAt: number
  updatedAt: number
  conversations: Conversation[]
}

// --- Conversation ---
export type ChatMode = 'qa' | 'edit'

export interface Conversation {
  id: string
  projectId: string
  title: string
  mode: ChatMode
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  metadata?: {
    mode?: ChatMode
    toolCalls?: ToolCall[]
    diffContent?: string
  }
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  result?: string
}

// --- Knowledge ---
export interface KnowledgeEntry {
  id: string
  title: string
  content: string
  tags: string[]
  source: 'manual' | 'ai' | 'import'
  projectId?: string
  createdAt: number
  updatedAt: number
}

// --- Skill ---
export interface Skill {
  id: string
  name: string
  description: string
  content: string
  type: 'builtin' | 'imported' | 'ai-generated'
  category: string
  createdAt: number
}

// --- AI Provider ---
export type AIProviderType = 'claude' | 'minimax' | 'openai' | 'ollama'

export interface AIProviderConfig {
  type: AIProviderType
  apiKey?: string
  baseUrl?: string
  model?: string
}

// --- IPC Channels ---
export const IPC_CHANNELS = {
  PROJECT_IMPORT: 'project:import',
  PROJECT_LIST: 'project:list',
  PROJECT_DELETE: 'project:delete',
  PROJECT_INDEX: 'project:index',
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_LIST: 'file:list',
  KNOWLEDGE_SAVE: 'knowledge:save',
  KNOWLEDGE_LIST: 'knowledge:list',
  KNOWLEDGE_DELETE: 'knowledge:delete',
  KNOWLEDGE_EXPORT: 'knowledge:export',
  SKILL_LIST: 'skill:list',
  SKILL_SAVE: 'skill:save',
  SKILL_DELETE: 'skill:delete',
  AI_CHAT: 'ai:chat',
  AI_STREAM: 'ai:stream',
  DIALOG_SELECT_DIR: 'dialog:selectDir',
} as const
