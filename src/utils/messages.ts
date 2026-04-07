// src/utils/messages.ts

import type {
  Message,
  NormalizedMessage,
  UserMessage,
  AssistantMessage,
  ContentBlock,
  ContentBlockParam,
  ToolUseBlock,
  ToolResultBlock,
  TextBlock,
} from '../types/message'

// UUID generation
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Derive UUID from parent (for multi-block messages)
export function deriveUUID(parentUUID: string, index: number): string {
  const hex = index.toString(16).padStart(12, '0')
  return `${parentUUID.slice(0, 24)}${hex}`
}

// Normalize messages - split multi-block messages into single-block messages
export function normalizeMessages(messages: Message[]): NormalizedMessage[] {
  const normalized: NormalizedMessage[] = []

  for (const message of messages) {
    if (message.type === 'assistant' && message.message?.content) {
      const blocks = message.message.content
      if (blocks.length === 1) {
        normalized.push(message as NormalizedMessage)
      } else {
        // Split multi-block messages
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i]
          normalized.push({
            ...message,
            uuid: message.uuid ?? generateUUID(),
            parentUuid: message.uuid,
          } as NormalizedMessage)
        }
      }
    } else if (message.type === 'user' && message.message?.content) {
      const content = message.message.content
      if (typeof content === 'string') {
        normalized.push(message as NormalizedMessage)
      } else if (Array.isArray(content)) {
        if (content.length === 1) {
          normalized.push(message as NormalizedMessage)
        } else {
          // Split multi-block messages
          for (let i = 0; i < content.length; i++) {
            normalized.push({
              ...message,
              uuid: message.uuid ?? generateUUID(),
              parentUuid: message.uuid,
            } as NormalizedMessage)
          }
        }
      }
    } else {
      normalized.push(message as NormalizedMessage)
    }
  }

  return normalized
}

// Message lookups for tool call association
export type MessageLookups = {
  toolResultByToolUseID: Map<string, NormalizedMessage>
  toolUseByToolUseID: Map<string, ToolUseBlock>
  toolUseIDsByMessageID: Map<string, Set<string>>
  resolvedToolUseIDs: Set<string>
  erroredToolUseIDs: Set<string>
}

export function buildMessageLookups(messages: NormalizedMessage[]): MessageLookups {
  const toolResultByToolUseID = new Map<string, NormalizedMessage>()
  const toolUseByToolUseID = new Map<string, ToolUseBlock>()
  const toolUseIDsByMessageID = new Map<string, Set<string>>()
  const resolvedToolUseIDs = new Set<string>()
  const erroredToolUseIDs = new Set<string>()

  for (const msg of messages) {
    if (msg.type === 'assistant' && msg.message?.content) {
      const toolUseIDs = new Set<string>()
      for (const block of msg.message.content) {
        if (block.type === 'tool_use') {
          toolUseByToolUseID.set(block.id, block)
          toolUseIDs.add(block.id)
        }
      }
      if (toolUseIDs.size > 0) {
        toolUseIDsByMessageID.set(msg.uuid ?? '', toolUseIDs)
      }
    }

    if (msg.type === 'user' && msg.message?.content) {
      const content = msg.message.content
      if (typeof content === 'string') {
        // No tool results in text content
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'tool_result') {
            toolResultByToolUseID.set(block.tool_use_id, msg)
            resolvedToolUseIDs.add(block.tool_use_id)
            if (block.is_error) {
              erroredToolUseIDs.add(block.tool_use_id)
            }
          }
        }
      }
    }
  }

  return {
    toolResultByToolUseID,
    toolUseByToolUseID,
    toolUseIDsByMessageID,
    resolvedToolUseIDs,
    erroredToolUseIDs,
  }
}

// Helper to check message types
export function isToolUseRequestMessage(msg: Message): boolean {
  return (
    msg.type === 'assistant' &&
    Array.isArray(msg.message?.content) &&
    msg.message.content.some((b) => b.type === 'tool_use')
  )
}

export function isToolResultMessage(msg: Message): boolean {
  if (msg.type !== 'user') return false
  const content = msg.message?.content
  if (typeof content === 'string') return false
  if (Array.isArray(content)) {
    return content.some((b) => b.type === 'tool_result')
  }
  return false
}

export function isTextMessage(msg: Message): boolean {
  if (msg.type === 'user') {
    const content = msg.message?.content
    if (typeof content === 'string') return true
    if (Array.isArray(content)) {
      return content.some((b) => b.type === 'text')
    }
  }
  if (msg.type === 'assistant') {
    const blocks = msg.message?.content
    if (!blocks) return false
    return blocks.some((b) => b.type === 'text')
  }
  return false
}

export function isThinkingMessage(msg: Message): boolean {
  return (
    msg.type === 'assistant' &&
    Array.isArray(msg.message?.content) &&
    msg.message.content.some((b) => b.type === 'thinking' || b.type === 'redacted_thinking')
  )
}

// Create assistant message
export function createAssistantMessage(
  content: ContentBlock[],
  options?: { id?: string; model?: string }
): AssistantMessage {
  return {
    type: 'assistant',
    uuid: options?.id ?? generateUUID(),
    timestamp: new Date().toISOString(),
    message: {
      content,
    },
  }
}

// Create user message
export function createUserMessage(
  content: string | ContentBlockParam[],
  options?: { id?: string; isMeta?: boolean }
): UserMessage {
  return {
    type: 'user',
    uuid: options?.id ?? generateUUID(),
    timestamp: new Date().toISOString(),
    isMeta: options?.isMeta,
    message: {
      content,
    },
  }
}

// Create system message
export function createSystemMessage(
  messageText: string,
  subtype?: string,
  level?: string
): NormalizedMessage {
  return {
    type: 'system',
    uuid: generateUUID(),
    timestamp: new Date().toISOString(),
    subtype,
    level: level as any,
    message: messageText,
  } as NormalizedMessage
}