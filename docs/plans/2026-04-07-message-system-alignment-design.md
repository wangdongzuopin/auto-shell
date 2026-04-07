# 消息系统与状态管理对齐设计

## 目标

将 auto-shell 的对话系统完全对齐 claude-code-rev 的设计模式，包括：
- 消息类型系统
- 统一状态管理 (AppStateStore)
- 结构化工具调用
- UI 组件同步重构

## 参考项目

**claude-code-rev** (D:\Agent\claude-code-rev)

## 设计方案

### 1. 项目结构

```
src/
├── state/                      # 新状态管理 (对齐 claude-code-rev)
│   ├── store.ts               # Store<T> 接口 + createStore 实现
│   ├── AppState.tsx           # React Context Provider
│   ├── AppStateStore.ts       # AppState 类型定义
│   └── hooks.ts               # useAppState, useSetAppState
│
├── types/
│   └── message.ts             # 新消息类型定义
│
├── utils/
│   ├── messages.ts           # normalizeMessages, buildMessageLookups 等
│   └── permissions.ts        # 权限系统
│
├── components/
│   ├── Messages/              # 消息列表组件 (替代 ChatArea)
│   │   ├── Messages.tsx       # 主容器
│   │   ├── MessageRow.tsx     # 消息行包装
│   │   └── VirtualMessageList.tsx  # 虚拟滚动
│   ├── messages/              # 消息类型组件
│   │   ├── AssistantTextMessage.tsx
│   │   ├── AssistantToolUseMessage.tsx
│   │   ├── AssistantThinkingMessage.tsx
│   │   ├── UserTextMessage.tsx
│   │   ├── UserToolResultMessage.tsx
│   │   └── SystemTextMessage.tsx
│   └── PromptInput/           # 输入组件 (替代 ChatInput)
│       ├── PromptInput.tsx
│       └── PromptInputFooter.tsx
```

### 2. 消息类型 (完全对齐 claude-code-rev)

#### MessageBase
所有消息共享的基础字段：
```typescript
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
}
```

#### Message Union Types
```typescript
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
```

#### ContentBlock (消息内容块)

Assistant 消息内容块类型：
```typescript
export type ContentBlock =
  | { type: 'text'; text: string; citations?: unknown }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'thinking'; thinking: string }
  | { type: 'redacted_thinking' }
  | { type: 'server_tool_use'; ... }
  | { type: 'code_execution_tool_result'; ... }
  | { type: 'mcp_tool_use'; ... }
  | { type: 'mcp_tool_result'; ... }
```

User 消息内容块类型：
```typescript
export type ContentBlockParam =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64' | 'url'; media_type: string; data: string } }
  | { type: 'tool_result'; tool_use_id: string; content: unknown; is_error?: boolean }
```

### 3. 状态管理 (完全对齐 AppStateStore)

#### Store<T> 接口
```typescript
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
      if (Object.is(next, prev)) return  // Early exit on NOOP updates
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

#### AppState 类型
```typescript
export type AppState = {
  // Settings
  settings: SettingsJson

  // Messages
  messages: NormalizedMessage[]

  // Tool & Permission
  toolPermissionContext: ToolPermissionContext
  permissionMode: PermissionMode

  // UI State
  isLoading: boolean
  expandedView: 'none' | 'tasks' | 'teammates'

  // Speculation (推测执行)
  speculation: SpeculationState

  // MCP
  mcp: {
    clients: MCPServerConnection[]
    tools: Tool[]
    commands: Command[]
    resources: Record<string, ServerResource[]>
    pluginReconnectKey: number
  }

  // Notifications
  notifications: {
    current: Notification | null
    queue: Notification[]
  }

  // Inbox (消息队列)
  inbox: {
    messages: Array<{
      id: string
      from: string
      text: string
      timestamp: string
      status: 'pending' | 'processing' | 'processed'
      color?: string
      summary?: string
    }>
  }

  // Elicitation (提示队列)
  elicitation: {
    queue: ElicitationRequestEvent[]
  }

  // Thinking
  thinkingEnabled: boolean | undefined

  // Prompt Suggestion
  promptSuggestion: {
    text: string | null
    promptId: 'user_intent' | 'stated_intent' | null
    shownAt: number
    acceptedAt: number
    generationRequestId: string | null
  }
}
```

#### React Context 使用
```typescript
export const AppStoreContext = React.createContext<AppStateStore | null>(null)

export function AppStateProvider({ children, initialState, onChangeAppState }) {
  const [store] = useState(() =>
    createStore(initialState ?? getDefaultAppState(), onChangeAppState)
  )
  return (
    <AppStoreContext.Provider value={store}>
      {children}
    </AppStoreContext.Provider>
  )
}

// Selector hook
export function useAppState<T>(selector: (state: AppState) => T): T {
  const store = useAppStore()
  const get = () => selector(store.getState())
  return useSyncExternalStore(store.subscribe, get, get)
}

// 注意: 不要从 selector 返回新对象，使用现有引用
// 正确: const { text, promptId } = useAppState(s => s.promptSuggestion)
// 错误: const { text, promptId } = useAppState(s => ({ text: s.promptSuggestion.text, ... }))
```

### 4. 结构化工具调用

#### 工具调用流程

1. **Assistant 发送 tool_use 块**：
```typescript
{
  type: 'assistant',
  message: {
    content: [
      { type: 'text', text: '我将列出文件...' },
      { type: 'tool_use', id: 'abc123', name: 'Bash', input: { command: 'ls -la' } }
    ]
  }
}
```

2. **权限检查** (基于 permissionMode)：
```typescript
export type PermissionMode =
  | 'default'      // 正常提示
  | 'plan'         // 计划模式
  | 'acceptEdits'  // 自动接受编辑
  | 'bypassPermissions' // 跳过所有权限检查
  | 'dontAsk'      // 将询问转为拒绝
```

3. **用户收到 tool_result 块**：
```typescript
{
  type: 'user',
  message: {
    content: [
      { type: 'tool_result', tool_use_id: 'abc123', content: 'total 8\ndrwxr-x...', is_error: false }
    ]
  }
}
```

4. **通过 tool_use_id 关联**：
- `tool_use.id` 和 `tool_result.tool_use_id` 配对
- 用于 UI 显示和消息排序

### 5. 消息规范化 (normalizeMessages)

```typescript
// 多块消息被拆分为单块消息
export function normalizeMessages(messages: Message[]): NormalizedMessage[] {
  // 单块消息保持原 UUID
  // 多块消息为每块派生新 UUID: deriveUUID(parent, index)
}

// 关键函数
export function deriveUUID(parentUUID: UUID, index: number): UUID {
  const hex = index.toString(16).padStart(12, '0')
  return `${parentUUID.slice(0, 24)}${hex}` as UUID
}

// 构建查找表
export function buildMessageLookups(messages: NormalizedMessage[]): MessageLookups {
  // toolResultByToolUseID: Map<string, NormalizedMessage>
  // toolUseByToolUseID: Map<string, ToolUseBlockParam>
  // toolUseIDsByMessageID: Map<string, Set<string>>
}
```

### 6. 推测执行 (Speculation)

```typescript
export type SpeculationState =
  | { status: 'idle' }
  | {
      status: 'active'
      id: string
      abort: () => void
      startTime: number
      messagesRef: { current: Message[] }
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
```

### 7. UI 组件对应关系

| auto-shell (旧) | claude-code-rev 风格 (新) |
|-----------------|--------------------------|
| `ChatArea` | `Messages` + `VirtualMessageList` |
| `ChatMessage` | `MessageRow` → 分发到具体消息类型组件 |
| `ChatInput` | `PromptInput` + `PromptInputFooter` |
| 无 | `AssistantThinkingMessage` (思考动画) |
| 无 | `AssistantToolUseMessage` + `UserToolResultMessage` |
| 无 | `SystemTextMessage` (系统消息) |
| 简单滚动 | 虚拟滚动 (VirtualMessageList) |
| 无 | 消息分组 (applyGrouping) |

### 8. 实现顺序

1. **Phase 1: 核心类型**
   - `src/types/message.ts`
   - `src/state/store.ts`
   - `src/state/AppStateStore.ts`
   - `src/state/AppState.tsx`
   - `src/state/hooks.ts`

2. **Phase 2: 消息工具**
   - `src/utils/messages.ts`
   - `src/utils/permissions.ts`

3. **Phase 3: UI 组件**
   - `src/components/Messages/`
   - `src/components/messages/`
   - `src/components/PromptInput/`

4. **Phase 4: 功能集成**
   - 推测执行
   - 消息压缩
   - 工具调用集成

## 约束

- 保持与 auto-shell 现有 Electron + React 架构兼容
- 不直接移植 Ink 终端组件，重新设计桌面 UI
- 消息类型和状态管理完全对齐 claude-code-rev
