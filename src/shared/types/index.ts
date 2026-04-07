// Shared types for auto-shell
// This file contains types used across main, preload, and renderer processes

// Message Origin
export interface MessageOrigin {
  kind?: string
  [key: string]: unknown
}

// Message Base
export interface MessageBase {
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

// Content Block types
export interface TextBlock {
  type: 'text'
  text: string
  citations?: unknown
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}

export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
}

export interface RedactedThinkingBlock {
  type: 'redacted_thinking'
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: unknown
  is_error?: boolean
}

export interface ImageBlock {
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
export interface UserMessage extends MessageBase {
  type: 'user'
  message: {
    content: string | ContentBlockParam[]
    [key: string]: unknown
  }
}

export interface AssistantMessage extends MessageBase {
  type: 'assistant'
  message?: {
    content?: ContentBlock[]
    [key: string]: unknown
  }
}

export interface ProgressMessage extends MessageBase {
  type: 'progress'
  progress?: unknown
}

export type SystemMessageLevel = 'info' | 'warning' | 'error' | string

export interface SystemMessage extends MessageBase {
  type: 'system'
  subtype?: string
  level?: SystemMessageLevel
  message?: string
}

export interface AttachmentMessage extends MessageBase {
  type: 'attachment'
  path?: string
}

export interface HookResultMessage extends MessageBase {
  type: 'hook_result'
}

export interface ToolUseSummaryMessage extends MessageBase {
  type: 'tool_use_summary'
}

export interface TombstoneMessage extends MessageBase {
  type: 'tombstone'
}

export interface GroupedToolUseMessage extends MessageBase {
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

// Legacy types for backward compatibility
export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
  knowledgeIds?: string[];
}

export interface Artifact {
  id: string;
  type: 'code' | 'document' | 'image';
  title: string;
  content: string;
  language?: string;
  createdAt: number;
}

export interface Knowledge {
  id: string;
  name: string;
  description?: string;
  files: KnowledgeFile[];
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  enabled: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  threadIds: string[];
  knowledgeIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
}
