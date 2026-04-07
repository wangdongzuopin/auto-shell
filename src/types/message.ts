// src/types/message.ts

export type MessageOrigin = {
  kind?: string
  [key: string]: unknown
}

export type MessageBase = {
  uuid?: string
  parentUuid?: string
  timestamp?: string
  createdAt?: string
  isMeta?: boolean
  isVirtual?: boolean
  isCompactSummary?: boolean
  toolUseResult?: unknown
  origin?: MessageOrigin
  [key: string]: unknown
}

// Content Block types for message.content
export type TextBlock = {
  type: 'text'
  text: string
  citations?: unknown
}

export type ToolUseBlock = {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}

export type ThinkingBlock = {
  type: 'thinking'
  thinking: string
}

export type RedactedThinkingBlock = {
  type: 'redacted_thinking'
}

export type ToolResultBlock = {
  type: 'tool_result'
  tool_use_id: string
  content: unknown
  is_error?: boolean
}

export type ImageBlock = {
  type: 'image'
  source: {
    type: 'base64' | 'url'
    media_type: string
    data: string
  }
}

export type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ThinkingBlock
  | RedactedThinkingBlock

export type ContentBlockParam =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64' | 'url'; media_type: string; data: string } }
  | ToolResultBlock

// Message types
export type UserMessage = MessageBase & {
  type: 'user'
  message: {
    content: string | ContentBlockParam[]
    [key: string]: unknown
  }
}

export type AssistantMessage = MessageBase & {
  type: 'assistant'
  message?: {
    content?: ContentBlock[]
    [key: string]: unknown
  }
}

export type ProgressMessage = MessageBase & {
  type: 'progress'
  progress?: unknown
}

export type SystemMessageLevel = 'info' | 'warning' | 'error' | string

export type SystemMessage = MessageBase & {
  type: 'system'
  subtype?: string
  level?: SystemMessageLevel
  message?: string
}

export type AttachmentMessage = MessageBase & {
  type: 'attachment'
  path?: string
}

export type HookResultMessage = MessageBase & {
  type: 'hook_result'
}

export type ToolUseSummaryMessage = MessageBase & {
  type: 'tool_use_summary'
}

export type TombstoneMessage = MessageBase & {
  type: 'tombstone'
}

export type GroupedToolUseMessage = MessageBase & {
  type: 'grouped_tool_use'
}

export type Message =
  | UserMessage
  | AssistantMessage
  | ProgressMessage
  | SystemMessage
  | AttachmentMessage
  | HookResultMessage
  | ToolUseSummaryMessage
  | TombstoneMessage
  | GroupedToolUseMessage

export type NormalizedMessage = Message

// Permission Mode
export type PermissionMode =
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'default'
  | 'dontAsk'
  | 'plan'
