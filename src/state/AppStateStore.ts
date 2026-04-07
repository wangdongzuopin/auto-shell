// src/state/AppStateStore.ts

import type { NormalizedMessage } from '../types/message'
import type { PermissionMode, ToolPermissionContext } from '../utils/permissions'
import type { Store } from './store'

// Notification
export type Notification = {
  id: string
  type: string
  message: string
  timestamp: number
}

// Elicitation (prompt queue)
export type ElicitationRequestEvent = {
  id: string
  type: string
  params?: unknown
}

// Speculation types
export type CompletionBoundary =
  | { type: 'complete'; completedAt: number; outputTokens: number }
  | { type: 'bash'; command: string; completedAt: number }
  | { type: 'edit'; toolName: string; filePath: string; completedAt: number }
  | { type: 'denied_tool'; toolName: string; detail: string; completedAt: number }

export type SpeculationResult = {
  messages: NormalizedMessage[]
  boundary: CompletionBoundary | null
  timeSavedMs: number
}

export type SpeculationState =
  | { status: 'idle' }
  | {
      status: 'active'
      id: string
      abort: () => void
      startTime: number
      messagesRef: { current: NormalizedMessage[] }
      writtenPathsRef: { current: Set<string> }
      boundary: CompletionBoundary | null
      suggestionLength: number
      toolUseCount: number
      isPipelined: boolean
      pipelinedSuggestion?: {
        text: string
        promptId: 'user_intent' | 'stated_intent'
        generationRequestId: string | null
      } | null
    }

export const IDLE_SPECULATION_STATE: SpeculationState = { status: 'idle' }

// Prompt Suggestion
export type PromptSuggestion = {
  text: string | null
  promptId: 'user_intent' | 'stated_intent' | null
  shownAt: number
  acceptedAt: number
  generationRequestId: string | null
}

// Inbox message
export type InboxMessage = {
  id: string
  from: string
  text: string
  timestamp: string
  status: 'pending' | 'processing' | 'processed'
  color?: string
  summary?: string
}

// Tool definitions (simplified from claude-code-rev)
export type Tool = {
  name: string
  description: string
  inputSchema: unknown
}

// MCP types
export type MCPServerConnection = {
  name: string
  status: string
}

export type MCPState = {
  clients: MCPServerConnection[]
  tools: Tool[]
  commands: unknown[]
  resources: Record<string, unknown[]>
  pluginReconnectKey: number
}

// Main AppState type
export type AppState = {
  // Settings
  settings: Record<string, unknown>

  // Messages
  messages: NormalizedMessage[]

  // Tool & Permission
  toolPermissionContext: ToolPermissionContext
  permissionMode: PermissionMode

  // UI State
  isLoading: boolean
  expandedView: 'none' | 'tasks' | 'teammates'
  isBriefOnly: boolean

  // Speculation
  speculation: SpeculationState
  speculationSessionTimeSavedMs: number

  // Thinking
  thinkingEnabled: boolean | undefined

  // Prompt Suggestion
  promptSuggestion: PromptSuggestion
  promptSuggestionEnabled: boolean

  // MCP
  mcp: MCPState

  // Notifications
  notifications: {
    current: Notification | null
    queue: Notification[]
  }

  // Inbox
  inbox: {
    messages: InboxMessage[]
  }

  // Elicitation
  elicitation: {
    queue: ElicitationRequestEvent[]
  }
}

export type AppStateStore = Store<AppState>

export function getDefaultAppState(): AppState {
  return {
    settings: {},
    messages: [],
    toolPermissionContext: {
      mode: 'default',
      allowedCommands: [],
      deniedCommands: [],
    },
    permissionMode: 'default',
    isLoading: false,
    expandedView: 'none',
    isBriefOnly: false,
    speculation: IDLE_SPECULATION_STATE,
    speculationSessionTimeSavedMs: 0,
    thinkingEnabled: true,
    promptSuggestion: {
      text: null,
      promptId: null,
      shownAt: 0,
      acceptedAt: 0,
      generationRequestId: null,
    },
    promptSuggestionEnabled: false,
    mcp: {
      clients: [],
      tools: [],
      commands: [],
      resources: {},
      pluginReconnectKey: 0,
    },
    notifications: {
      current: null,
      queue: [],
    },
    inbox: {
      messages: [],
    },
    elicitation: {
      queue: [],
    },
  }
}
