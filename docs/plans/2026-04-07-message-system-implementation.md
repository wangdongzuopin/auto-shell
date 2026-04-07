# Message System Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align auto-shell's message system with claude-code-rev: complete message types, unified AppStateStore, structured tool calls, virtual scrolling UI, speculation.

**Architecture:** Replace scattered stores with unified AppStateStore + normalized message types. UI components refactored to use component dispatch pattern with virtual scrolling.

**Tech Stack:** React 18, Zustand (existing), TypeScript, react-window or similar for virtual scrolling.

---

## Phase 1: Core Types

### Task 1: Create message types

**Files:**
- Create: `src/types/message.ts`

**Step 1: Write the message types**

```typescript
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
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit src/types/message.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types/message.ts
git commit -m "feat(types): add message type definitions aligned with claude-code-rev"
```

---

### Task 2: Create Store<T> implementation

**Files:**
- Create: `src/state/store.ts`

**Step 1: Write the Store<T> implementation**

```typescript
// src/state/store.ts

type Listener = () => void
type OnChange<T> = (args: { newState: T; oldState: T }) => void

export type Store<T> = {
  getState: () => T
  setState: (updater: (prev: T) => T) => void
  subscribe: (listener: Listener) => () => void
}

export function createStore<T>(
  initialState: T,
  onChange?: OnChange<T>,
): Store<T> {
  let state = initialState
  const listeners = new Set<Listener>()

  return {
    getState: () => state,

    setState: (updater: (prev: T) => T) => {
      const prev = state
      const next = updater(prev)
      if (Object.is(next, prev)) return
      state = next
      onChange?.({ newState: next, oldState: prev })
      for (const listener of listeners) listener()
    },

    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit src/state/store.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/state/store.ts
git commit -m "feat(state): add Store<T> implementation aligned with claude-code-rev"
```

---

### Task 3: Create AppState types

**Files:**
- Create: `src/state/AppStateStore.ts`

**Step 1: Write the AppState type definitions**

```typescript
// src/state/AppStateStore.ts

import type { NormalizedMessage } from '../types/message'
import type { PermissionMode, ToolPermissionContext } from '../utils/permissions'

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
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit src/state/AppStateStore.ts`
Expected: No errors (may need stub files for missing types)

**Step 3: Commit**

```bash
git add src/state/AppStateStore.ts
git commit -m "feat(state): add AppState type definitions"
```

---

### Task 4: Create AppState Context and hooks

**Files:**
- Create: `src/state/AppState.tsx`
- Create: `src/state/hooks.ts`

**Step 1: Write AppState.tsx**

```typescript
// src/state/AppState.tsx

import React, { createContext, useContext, useState } from 'react'
import type { AppState, AppStateStore } from './AppStateStore'
import { createStore, getDefaultAppState } from './store'

export const AppStoreContext = createContext<AppStateStore | null>(null)

export function AppStateProvider({
  children,
  initialState,
  onChangeAppState,
}: {
  children: React.ReactNode
  initialState?: AppState
  onChangeAppState?: (args: { newState: AppState; oldState: AppState }) => void
}) {
  const [store] = useState<AppStateStore>(() =>
    createStore(initialState ?? getDefaultAppState(), onChangeAppState)
  )

  return (
    <AppStoreContext.Provider value={store}>
      {children}
    </AppStoreContext.Provider>
  )
}

export function useAppStore(): AppStateStore {
  const store = useContext(AppStoreContext)
  if (!store) {
    throw new Error('useAppStore must be used within AppStateProvider')
  }
  return store
}
```

**Step 2: Write hooks.ts**

```typescript
// src/state/hooks.ts

import { useCallback, useSyncExternalStore } from 'react'
import { useAppStore } from './AppState'

export function useAppState<T>(selector: (state: AppState) => T): T {
  const store = useAppStore()
  const getSnapshot = useCallback(() => selector(store.getState()), [store, selector])
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

export function useSetAppState() {
  return useAppStore().setState
}

export function useAppStateStore() {
  return useAppStore()
}
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit src/state/AppState.tsx src/state/hooks.ts`
Expected: No errors

**Step 4: Commit**

```bash
git add src/state/AppState.tsx src/state/hooks.ts
git commit -m "feat(state): add AppState React context and hooks"
```

---

## Phase 2: Message Utilities

### Task 5: Create permissions types

**Files:**
- Create: `src/utils/permissions.ts`

**Step 1: Write the permissions types**

```typescript
// src/utils/permissions.ts

import type { PermissionMode } from '../types/message'

export type ToolPermissionContext = {
  mode: PermissionMode
  allowedCommands: string[]
  deniedCommands: string[]
}

export function getEmptyToolPermissionContext(): ToolPermissionContext {
  return {
    mode: 'default',
    allowedCommands: [],
    deniedCommands: [],
  }
}

export type PermissionResult = {
  behavior: 'allow' | 'deny' | 'ask'
  updatedInput?: unknown
}

export async function hasPermissionsToUseTool(
  toolName: string,
  input: unknown,
  context: ToolPermissionContext
): Promise<PermissionResult> {
  // Check always-allow rules
  if (context.allowedCommands.includes(toolName)) {
    return { behavior: 'allow' }
  }

  // Check always-deny rules
  if (context.deniedCommands.includes(toolName)) {
    return { behavior: 'deny' }
  }

  // Apply mode-specific transformations
  switch (context.mode) {
    case 'bypassPermissions':
      return { behavior: 'allow' }
    case 'dontAsk':
      return { behavior: 'deny' }
    case 'acceptEdits':
      // Auto-allow file edits
      if (toolName === 'Write' || toolName === 'Edit' || toolName === 'Bash') {
        return { behavior: 'allow' }
      }
      return { behavior: 'ask' }
    case 'plan':
      // In plan mode, ask for confirmation
      return { behavior: 'ask' }
    default:
      return { behavior: 'ask' }
  }
}
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit src/utils/permissions.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/utils/permissions.ts
git commit -m "feat(permissions): add permission types and hasPermissionsToUseTool"
```

---

### Task 6: Create message utilities

**Files:**
- Create: `src/utils/messages.ts`

**Step 1: Write the message utilities**

```typescript
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
  message: string,
  subtype?: string,
  level?: string
): NormalizedMessage {
  return {
    type: 'system',
    uuid: generateUUID(),
    timestamp: new Date().toISOString(),
    subtype,
    level: level as any,
    message,
  } as NormalizedMessage
}
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit src/utils/messages.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/utils/messages.ts
git commit -m "feat(messages): add message utilities (normalize, buildMessageLookups, helpers)"
```

---

## Phase 3: UI Components

### Task 7: Create VirtualMessageList component

**Files:**
- Create: `src/components/Messages/VirtualMessageList.tsx`
- Create: `src/components/Messages/VirtualMessageList.css`

**Step 1: Write VirtualMessageList component**

```tsx
// src/components/Messages/VirtualMessageList.tsx

import React, { useRef, useEffect, useCallback, useState } from 'react'
import type { NormalizedMessage } from '../../types/message'
import './VirtualMessageList.css'

interface VirtualMessageListProps {
  messages: NormalizedMessage[]
  renderMessage: (msg: NormalizedMessage, index: number) => React.ReactNode
  onScroll?: (isAtBottom: boolean) => void
}

const ITEM_HEIGHT_ESTIMATE = 80 // Average message height in pixels
const OVERSCAN = 5 // Number of items to render outside visible area

export const VirtualMessageList: React.FC<VirtualMessageListProps> = ({
  messages,
  renderMessage,
  onScroll,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT_ESTIMATE) - OVERSCAN)
  const endIndex = Math.min(
    messages.length - 1,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT_ESTIMATE) + OVERSCAN
  )

  // Get visible messages
  const visibleMessages: { msg: NormalizedMessage; index: number; offset: number }[] = []
  for (let i = startIndex; i <= endIndex; i++) {
    if (messages[i]) {
      visibleMessages.push({
        msg: messages[i],
        index: i,
        offset: i * ITEM_HEIGHT_ESTIMATE,
      })
    }
  }

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop: st, scrollHeight, clientHeight } = containerRef.current
      setScrollTop(st)
      const isAtBottom = scrollHeight - st - clientHeight < 50
      onScroll?.(!isAtBottom)
    }
  }, [onScroll])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerHeight(entry.contentRect.height)
        }
      })
      observer.observe(container)
      return () => observer.disconnect()
    }
  }, [])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (containerRef.current && scrollTop + containerHeight >= scrollRef.current.scrollHeight - 100) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages.length, scrollTop, containerHeight])

  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={(el) => {
        containerRef.current = el
        ;(scrollRef as any).current = el
      }}
      className="virtual-message-list"
      onScroll={handleScroll}
    >
      <div
        className="virtual-message-list-inner"
        style={{ height: messages.length * ITEM_HEIGHT_ESTIMATE }}
      >
        {visibleMessages.map(({ msg, index, offset }) => (
          <div
            key={msg.uuid ?? index}
            className="virtual-message-item"
            style={{ transform: `translateY(${offset}px)` }}
          >
            {renderMessage(msg, index)}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Write CSS**

```css
/* src/components/Messages/VirtualMessageList.css */

.virtual-message-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.virtual-message-list-inner {
  position: relative;
}

.virtual-message-item {
  position: absolute;
  left: 0;
  right: 0;
}
```

**Step 3: Verify compilation**

Run: `npx tsc --noEmit src/components/Messages/VirtualMessageList.tsx`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/Messages/VirtualMessageList.tsx src/components/Messages/VirtualMessageList.css
git commit -m "feat(ui): add VirtualMessageList component"
```

---

### Task 8: Create message type components

**Files:**
- Create: `src/components/messages/UserTextMessage.tsx`
- Create: `src/components/messages/AssistantTextMessage.tsx`
- Create: `src/components/messages/AssistantThinkingMessage.tsx`
- Create: `src/components/messages/AssistantToolUseMessage.tsx`
- Create: `src/components/messages/UserToolResultMessage.tsx`
- Create: `src/components/messages/SystemTextMessage.tsx`

**Step 1: Write UserTextMessage**

```tsx
// src/components/messages/UserTextMessage.tsx

import React from 'react'
import type { TextBlock } from '../../types/message'
import './messages.css'

interface UserTextMessageProps {
  text: string
  timestamp?: string
}

export const UserTextMessage: React.FC<UserTextMessageProps> = ({ text, timestamp }) => {
  const formatTime = (ts?: string) => {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="message-bubble user">
      <div className="message-content">{text}</div>
      {timestamp && <span className="message-time">{formatTime(timestamp)}</span>}
    </div>
  )
}
```

**Step 2: Write AssistantTextMessage**

```tsx
// src/components/messages/AssistantTextMessage.tsx

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { TextBlock } from '../../types/message'
import './messages.css'

interface AssistantTextMessageProps {
  text: string
  timestamp?: string
}

export const AssistantTextMessage: React.FC<AssistantTextMessageProps> = ({ text, timestamp }) => {
  const formatTime = (ts?: string) => {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="message-bubble assistant">
      <div className="message-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
      {timestamp && <span className="message-time">{formatTime(timestamp)}</span>}
    </div>
  )
}
```

**Step 3: Write AssistantThinkingMessage**

```tsx
// src/components/messages/AssistantThinkingMessage.tsx

import React from 'react'
import type { ThinkingBlock } from '../../types/message'
import './messages.css'

interface AssistantThinkingMessageProps {
  thinking: string
}

export const AssistantThinkingMessage: React.FC<AssistantThinkingMessageProps> = ({ thinking }) => {
  return (
    <div className="message-bubble thinking">
      <div className="thinking-indicator">
        <span className="thinking-dot"></span>
        <span className="thinking-dot"></span>
        <span className="thinking-dot"></span>
        <span className="thinking-text">思考中...</span>
      </div>
      <div className="thinking-content">{thinking}</div>
    </div>
  )
}
```

**Step 4: Write AssistantToolUseMessage**

```tsx
// src/components/messages/AssistantToolUseMessage.tsx

import React from 'react'
import type { ToolUseBlock } from '../../types/message'
import './messages.css'

interface AssistantToolUseMessageProps {
  toolUse: ToolUseBlock
  onApprove?: (id: string) => void
  onDeny?: (id: string) => void
}

export const AssistantToolUseMessage: React.FC<AssistantToolUseMessageProps> = ({
  toolUse,
  onApprove,
  onDeny,
}) => {
  return (
    <div className="message-bubble tool-use">
      <div className="tool-use-header">
        <span className="tool-use-icon">⚡</span>
        <span className="tool-use-name">{toolUse.name}</span>
      </div>
      <div className="tool-use-content">
        <pre>{JSON.stringify(toolUse.input, null, 2)}</pre>
      </div>
      <div className="tool-use-actions">
        <button className="tool-use-approve" onClick={() => onApprove?.(toolUse.id)}>
          允许
        </button>
        <button className="tool-use-deny" onClick={() => onDeny?.(toolUse.id)}>
          拒绝
        </button>
      </div>
    </div>
  )
}
```

**Step 5: Write UserToolResultMessage**

```tsx
// src/components/messages/UserToolResultMessage.tsx

import React from 'react'
import type { ToolResultBlock } from '../../types/message'
import './messages.css'

interface UserToolResultMessageProps {
  toolResult: ToolResultBlock
}

export const UserToolResultMessage: React.FC<UserToolResultMessageProps> = ({ toolResult }) => {
  const content = typeof toolResult.content === 'string'
    ? toolResult.content
    : JSON.stringify(toolResult.content, null, 2)

  return (
    <div className={`message-bubble tool-result ${toolResult.is_error ? 'error' : ''}`}>
      <div className="tool-result-header">
        <span className="tool-result-icon">{toolResult.is_error ? '❌' : '✅'}</span>
        <span className="tool-result-label">工具结果</span>
      </div>
      <div className="tool-result-content">
        <pre>{content}</pre>
      </div>
    </div>
  )
}
```

**Step 6: Write SystemTextMessage**

```tsx
// src/components/messages/SystemTextMessage.tsx

import React from 'react'
import type { SystemMessage } from '../../types/message'
import './messages.css'

interface SystemTextMessageProps {
  message: SystemMessage
}

export const SystemTextMessage: React.FC<SystemTextMessageProps> = ({ message }) => {
  const levelClass = message.level ? `system-${message.level}` : ''

  return (
    <div className={`message-bubble system ${levelClass}`}>
      <div className="system-content">
        {message.subtype && <span className="system-subtype">[{message.subtype}]</span>}
        {message.message}
      </div>
    </div>
  )
}
```

**Step 7: Write shared CSS**

```css
/* src/components/messages/messages.css */

.message-bubble {
  padding: 12px 16px;
  border-radius: 12px;
  max-width: 80%;
  margin-bottom: 8px;
}

.message-bubble.user {
  background: #e3f2fd;
  margin-left: auto;
}

.message-bubble.assistant {
  background: #f5f5f5;
}

.message-bubble.thinking {
  background: #fff3e0;
}

.message-bubble.tool-use {
  background: #e8f5e9;
  border: 1px solid #4caf50;
}

.message-bubble.tool-result {
  background: #f5f5f5;
  border: 1px solid #9e9e9e;
}

.message-bubble.tool-result.error {
  background: #ffebee;
  border-color: #f44336;
}

.message-bubble.system {
  background: #e3f2fd;
  max-width: 100%;
  text-align: center;
}

.message-content {
  word-wrap: break-word;
}

.message-time {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  text-align: right;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.thinking-dot {
  width: 8px;
  height: 8px;
  background: #ff9800;
  border-radius: 50%;
  animation: thinking-pulse 1.4s infinite;
}

.thinking-dot:nth-child(2) { animation-delay: 0.2s; }
.thinking-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes thinking-pulse {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.thinking-content {
  font-size: 12px;
  color: #666;
  white-space: pre-wrap;
}

.tool-use-header,
.tool-result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
}

.tool-use-content pre,
.tool-result-content pre {
  background: rgba(0,0,0,0.05);
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 13px;
}

.tool-use-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.tool-use-actions button {
  padding: 4px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.tool-use-approve {
  background: #4caf50;
  color: white;
}

.tool-use-deny {
  background: #f44336;
  color: white;
}
```

**Step 8: Verify compilation**

Run: `npx tsc --noEmit src/components/messages/*.tsx`
Expected: No errors

**Step 9: Commit**

```bash
git add src/components/messages/
git commit -m "feat(ui): add message type components (UserText, AssistantText, Thinking, ToolUse, ToolResult, System)"
```

---

### Task 9: Create MessageRow dispatcher

**Files:**
- Create: `src/components/Messages/MessageRow.tsx`

**Step 1: Write MessageRow**

```tsx
// src/components/Messages/MessageRow.tsx

import React from 'react'
import type { NormalizedMessage, ContentBlock, TextBlock, ToolUseBlock, ThinkingBlock, ToolResultBlock } from '../../types/message'
import { UserTextMessage } from '../messages/UserTextMessage'
import { AssistantTextMessage } from '../messages/AssistantTextMessage'
import { AssistantThinkingMessage } from '../messages/AssistantThinkingMessage'
import { AssistantToolUseMessage } from '../messages/AssistantToolUseMessage'
import { UserToolResultMessage } from '../messages/UserToolResultMessage'
import { SystemTextMessage } from '../messages/SystemTextMessage'
import './MessageRow.css'

interface MessageRowProps {
  message: NormalizedMessage
}

export const MessageRow: React.FC<MessageRowProps> = ({ message }) => {
  const renderContent = () => {
    switch (message.type) {
      case 'user': {
        const content = message.message?.content
        if (typeof content === 'string') {
          return <UserTextMessage text={content} timestamp={message.timestamp} />
        }
        if (Array.isArray(content)) {
          return content.map((block, i) => {
            if (block.type === 'text') {
              return <UserTextMessage key={i} text={block.text} timestamp={message.timestamp} />
            }
            if (block.type === 'tool_result') {
              return <UserToolResultMessage key={i} toolResult={block as ToolResultBlock} />
            }
            return null
          })
        }
        return null
      }

      case 'assistant': {
        const blocks = message.message?.content
        if (!blocks || blocks.length === 0) {
          // Loading state
          return <AssistantThinkingMessage thinking="..." />
        }
        return blocks.map((block, i) => {
          switch (block.type) {
            case 'text':
              return <AssistantTextMessage key={i} text={block.text} timestamp={message.timestamp} />
            case 'thinking':
              return <AssistantThinkingMessage key={i} thinking={block.thinking} />
            case 'tool_use':
              return <AssistantToolUseMessage key={i} toolUse={block as ToolUseBlock} />
            default:
              return null
          }
        })
      }

      case 'system':
        return <SystemTextMessage message={message as any} />

      case 'progress':
        return <AssistantThinkingMessage thinking="加载中..." />

      default:
        return null
    }
  }

  return (
    <div className={`message-row message-row-${message.type}`}>
      <div className="message-avatar">
        {message.type === 'user' ? (
          <span className="avatar user-avatar">J</span>
        ) : message.type === 'assistant' ? (
          <span className="avatar ai-avatar">AI</span>
        ) : (
          <span className="avatar system-avatar">SYS</span>
        )}
      </div>
      <div className="message-body">{renderContent()}</div>
    </div>
  )
}
```

**Step 2: Write CSS**

```css
/* src/components/Messages/MessageRow.css */

.message-row {
  display: flex;
  gap: 12px;
  padding: 8px 16px;
}

.message-row-user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
}

.user-avatar {
  background: #2196f3;
  color: white;
}

.ai-avatar {
  background: #9c27b0;
  color: white;
}

.system-avatar {
  background: #607d8b;
  color: white;
}

.message-body {
  flex: 1;
  min-width: 0;
}
```

**Step 3: Verify compilation**

Run: `npx tsc --noEmit src/components/Messages/MessageRow.tsx`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/Messages/MessageRow.tsx src/components/Messages/MessageRow.css
git commit -m "feat(ui): add MessageRow dispatcher component"
```

---

### Task 10: Create Messages container

**Files:**
- Create: `src/components/Messages/Messages.tsx`
- Create: `src/components/Messages/Messages.css`

**Step 1: Write Messages**

```tsx
// src/components/Messages/Messages.tsx

import React, { useCallback, useState } from 'react'
import { useAppState } from '../../state/hooks'
import type { NormalizedMessage } from '../../types/message'
import { VirtualMessageList } from './VirtualMessageList'
import { MessageRow } from './MessageRow'
import { PromptInput } from '../PromptInput/PromptInput'
import './Messages.css'

export const Messages: React.FC = () => {
  const messages = useAppState((s) => s.messages)
  const isLoading = useAppState((s) => s.isLoading)
  const setState = useAppState((s) => s as any)?.setState

  const [showScrollButton, setShowScrollButton] = useState(false)

  const handleScroll = useCallback((isNotAtBottom: boolean) => {
    setShowScrollButton(isNotAtBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    // Handled by VirtualMessageList internal scroll
  }, [])

  const renderMessage = useCallback((msg: NormalizedMessage) => {
    return <MessageRow message={msg} />
  }, [])

  if (messages.length === 0) {
    return (
      <div className="messages-empty">
        <div className="empty-state">
          <h2>你好</h2>
          <p>有什么可以帮助你的吗？</p>
        </div>
        <div className="messages-input-area">
          <PromptInput />
        </div>
      </div>
    )
  }

  return (
    <div className="messages-container">
      <div className="messages-list">
        <VirtualMessageList
          messages={messages}
          renderMessage={renderMessage}
          onScroll={handleScroll}
        />
      </div>
      {showScrollButton && (
        <button className="scroll-to-bottom" onClick={scrollToBottom}>
          滚动到底部
        </button>
      )}
      <div className="messages-input-area">
        <PromptInput />
      </div>
    </div>
  )
}
```

**Step 2: Write CSS**

```css
/* src/components/Messages/Messages.css */

.messages-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.messages-list {
  flex: 1;
  overflow: hidden;
}

.messages-empty {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
  align-items: center;
}

.empty-state {
  text-align: center;
  margin-bottom: 32px;
}

.empty-state h2 {
  margin: 0 0 8px;
}

.empty-state p {
  color: #666;
}

.messages-input-area {
  padding: 16px;
  background: white;
  border-top: 1px solid #eee;
}

.scroll-to-bottom {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
```

**Step 3: Verify compilation**

Run: `npx tsc --noEmit src/components/Messages/Messages.tsx`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/Messages/Messages.tsx src/components/Messages/Messages.css
git commit -m "feat(ui): add Messages container component"
```

---

### Task 11: Create PromptInput

**Files:**
- Create: `src/components/PromptInput/PromptInput.tsx`
- Create: `src/components/PromptInput/PromptInput.css`

**Step 1: Write PromptInput**

```tsx
// src/components/PromptInput/PromptInput.tsx

import React, { useState, useCallback, useRef } from 'react'
import { useAppState, useSetAppState } from '../../state/hooks'
import { createUserMessage, createAssistantMessage } from '../../utils/messages'
import type { ContentBlock, TextBlock, ToolUseBlock } from '../../types/message'
import './PromptInput.css'

export const PromptInput: React.FC = () => {
  const [input, setInput] = useState('')
  const isLoading = useAppState((s) => s.isLoading)
  const setState = useSetAppState()
  const messagesRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMsg = createUserMessage(input.trim())
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isLoading: true,
    }))

    setInput('')

    // Simulate AI response (placeholder - integrate with actual AI later)
    setTimeout(() => {
      const assistantMsg = createAssistantMessage([
        { type: 'text', text: `收到: ${userMsg.message.content}` } as TextBlock
      ])
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        isLoading: false,
      }))
    }, 1000)
  }, [input, isLoading, setState])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const handleStop = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: false }))
  }, [setState])

  return (
    <div className="prompt-input-container">
      <div className="prompt-input-wrapper">
        <textarea
          ref={messagesRef}
          className="prompt-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          rows={1}
        />
        <div className="prompt-input-actions">
          {isLoading ? (
            <button className="prompt-stop" onClick={handleStop}>
              停止
            </button>
          ) : (
            <button className="prompt-send" onClick={handleSubmit} disabled={!input.trim()}>
              发送
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Write CSS**

```css
/* src/components/PromptInput/PromptInput.css */

.prompt-input-container {
  width: 100%;
}

.prompt-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  background: #f5f5f5;
  border-radius: 24px;
  padding: 8px 16px;
}

.prompt-input {
  flex: 1;
  border: none;
  background: transparent;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  max-height: 120px;
  outline: none;
}

.prompt-input::placeholder {
  color: #999;
}

.prompt-input-actions {
  display: flex;
  gap: 8px;
}

.prompt-send,
.prompt-stop {
  padding: 8px 16px;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.prompt-send {
  background: #2196f3;
  color: white;
}

.prompt-send:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.prompt-stop {
  background: #f44336;
  color: white;
}
```

**Step 3: Verify compilation**

Run: `npx tsc --noEmit src/components/PromptInput/PromptInput.tsx`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/PromptInput/PromptInput.tsx src/components/PromptInput/PromptInput.css
git commit -m "feat(ui): add PromptInput component"
```

---

## Phase 4: Integration

### Task 12: Update App.tsx to use new components

**Files:**
- Modify: `src/renderer/App.tsx`

**Step 1: Read current App.tsx**

Run: `cat src/renderer/App.tsx`

**Step 2: Update App.tsx to use AppStateProvider and Messages**

```tsx
// src/renderer/App.tsx - Updated

import React from 'react'
import { AppStateProvider } from '../state/AppState'
import { Messages } from '../components/Messages/Messages'

export const App: React.FC = () => {
  return (
    <AppStateProvider>
      <div className="app">
        <Messages />
      </div>
    </AppStateProvider>
  )
}
```

**Step 3: Verify compilation**

Run: `npx tsc --noEmit src/renderer/App.tsx`
Expected: No errors

**Step 4: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat(app): integrate AppStateProvider and Messages component"
```

---

### Task 13: Build and test

**Step 1: Run build**

Run: `npm run build`
Expected: Successful build with no errors

**Step 2: Run dev server**

Run: `npm run dev`
Expected: Dev server starts successfully

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: complete message system alignment with claude-code-rev

- Complete message type system (User/Assistant/Progress/System/Attachment)
- Unified AppStateStore with Store<T> pattern
- Content block system for text, tool_use, thinking, tool_result
- Virtual scrolling with VirtualMessageList
- Message type components (UserText, AssistantText, Thinking, ToolUse, ToolResult, System)
- MessageRow dispatcher pattern
- Messages container with PromptInput
- AppState React context integration"
```

---

## Verification Checklist

After implementation, verify:

- [ ] Message types compile without errors
- [ ] Store<T> works with useSyncExternalStore
- [ ] AppStateProvider wraps the app
- [ ] Messages render correctly in VirtualMessageList
- [ ] User messages show on right side
- [ ] Assistant messages show on left side
- [ ] Thinking indicator displays for loading states
- [ ] Tool use blocks render with approve/deny buttons
- [ ] Tool results display with success/error styling
- [ ] System messages render with appropriate styling
- [ ] PromptInput sends messages and triggers AI response
- [ ] Scroll to bottom button appears when scrolled up
- [ ] Build succeeds
- [ ] Dev server runs without errors
