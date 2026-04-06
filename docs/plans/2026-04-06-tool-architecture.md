# Tool Architecture Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Claude Code's advanced tool architecture into auto-shell, enabling AI to call system tools (file ops, Git, search, etc.) with permission control and lifecycle hooks.

**Architecture:** We'll extend auto-shell's existing tool system with: (1) enhanced Tool interface with inputSchema validation, (2) tool execution engine with concurrency control, (3) permission system with rule-based access, (4) hooks for lifecycle events, (5) new system tools (Read/Edit/File/Git/Search). The AI provider will be extended to support structured tool calls instead of pure prompt-based approach.

**Tech Stack:** TypeScript, Zod for schema validation, Electron IPC, node-pty

---

## Task 1: Extend Tool Interface with InputSchema and Metadata

**Files:**
- Modify: `src/tools/Tool.ts`
- Modify: `src/tools/types.ts`
- Modify: `src/tools/buildTool.ts`

**Step 1: Write the failing test**

Create `src/tools/__tests__/tool-schema.test.ts`:

```typescript
import { z } from 'zod';
import { Tool, TOOL_DEFAULTS } from '../Tool';

const ReadFileSchema = z.object({
  path: z.string(),
  encoding: z.enum(['utf-8', 'base64']).optional(),
});

interface ReadFileInput {
  path: string;
  encoding?: 'utf-8' | 'base64';
}

describe('Tool with InputSchema', () => {
  it('should validate input against schema', () => {
    const tool = {
      ...TOOL_DEFAULTS,
      name: 'Read',
      description: 'Read file contents',
      inputSchema: ReadFileSchema,
      call: async (args: ReadFileInput) => ({ data: 'content' }),
    } as Tool<ReadFileInput, { data: string }>;

    // Valid input should pass
    const result = tool.inputSchema?.safeParse({ path: 'test.txt' });
    expect(result?.success).toBe(true);
  });

  it('should reject invalid input', () => {
    const tool = {
      ...TOOL_DEFAULTS,
      name: 'Read',
      description: 'Read file contents',
      inputSchema: ReadFileSchema,
    } as Tool<ReadFileInput, { data: string }>;

    // Missing required field should fail
    const result = tool.inputSchema?.safeParse({});
    expect(result?.success).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd D:/Agent/auto-shell && npx jest src/tools/__tests__/tool-schema.test.ts --no-coverage`
Expected: FAIL - "Cannot find module 'zod'" (need to add zod)

**Step 3: Add zod dependency**

Run: `cd D:/Agent/auto-shell && npm install zod && npm install -D @types/zod`

**Step 4: Write implementation**

Modify `src/tools/Tool.ts`:

```typescript
import type { ReactNode } from 'react';
import { z } from 'zod';
import type { ToolContext, ToolResult } from './types';

export interface Tool<Input = unknown, Output = unknown> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema?: z.ZodType<Input>;
  maxResultSizeChars?: number;
  call(args: Input, context: ToolContext): Promise<ToolResult<Output>>;
  getDescription(input?: Partial<Input>): string;
  isEnabled(): boolean;
  isConcurrencySafe(input: Input): boolean;
  isReadOnly(input: Input): boolean;
  renderToolUseMessage(input: Partial<Input>): ReactNode;
  renderToolResultMessage(output: Output): ReactNode;
}

export const TOOL_DEFAULTS = {
  isEnabled: () => true,
  isConcurrencySafe: () => false,
  isReadOnly: () => false,
  maxResultSizeChars: 10_000,
} as const;
```

Modify `src/tools/types.ts`:

```typescript
import { z } from 'zod';
import type { AIProvider } from '../ai/provider';
import type { ChatMessage } from '../shared/types';

export interface ToolContext {
  cwd: string;
  shell: string;
  aiProvider: AIProvider;
}

export interface ToolResult<T> {
  data: T;
  newMessages?: ChatMessage[];
  error?: string;
}

export type ToolDefinition<Input, Output> =
  Omit<Tool<Input, Output>, 'isEnabled' | 'isConcurrencySafe' | 'isReadOnly' | 'maxResultSizeChars'> &
  Partial<Pick<Tool<Input, Output>, 'isEnabled' | 'isConcurrencySafe' | 'isReadOnly' | 'maxResultSizeChars'>>;
```

**Step 5: Run test to verify it passes**

Run: `cd D:/Agent/auto-shell && npx jest src/tools/__tests__/tool-schema.test.ts --no-coverage`
Expected: PASS

**Step 6: Commit**

```bash
cd D:/Agent/auto-shell
git add src/tools/Tool.ts src/tools/types.ts src/tools/buildTool.ts
git commit -m "feat(tools): extend Tool interface with InputSchema support using Zod"
```

---

## Task 2: Add Tool Execution Engine

**Files:**
- Create: `src/tools/toolExecution.ts`
- Create: `src/tools/__tests__/toolExecution.test.ts`

**Step 1: Write the failing test**

```typescript
import { Tool, TOOL_DEFAULTS } from '../Tool';
import { ToolContext } from '../types';
import { runToolUse, checkPermissionsAndCallTool } from '../toolExecution';

const mockProvider = {
  name: 'test',
  isAvailable: async () => true,
  chat: async () => '',
  streamChat: async () => '',
  explainError: async () => '',
  naturalToCommand: async () => '',
  explainCommand: async () => ({ summary: '', parts: [] }),
  suggestCompletion: async () => [],
} as any;

const mockContext: ToolContext = {
  cwd: '/tmp',
  shell: 'bash',
  aiProvider: mockProvider,
};

describe('Tool Execution', () => {
  it('should execute tool and return result', async () => {
    const tool = {
      ...TOOL_DEFAULTS,
      name: 'Echo',
      description: 'Echo input',
      isConcurrencySafe: () => true,
      isReadOnly: () => true,
      call: async (args: { message: string }) => ({ data: { echoed: args.message } }),
    } as Tool<{ message: string }, { echoed: string }>;

    const result = await runToolUse(tool, { message: 'hello' }, mockContext);
    expect(result.data.echoed).toBe('hello');
  });

  it('should reject tool when permission denied', async () => {
    const tool = {
      ...TOOL_DEFAULTS,
      name: 'Write',
      description: 'Write file',
      isConcurrencySafe: () => false,
      isReadOnly: () => false,
      call: async () => ({ data: 'ok' }),
    } as Tool<Record<string, never>, string>;

    const result = await checkPermissionsAndCallTool(tool, {}, mockContext, 'deny');
    expect(result.error).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd D:/Agent/auto-shell && npx jest src/tools/__tests__/toolExecution.test.ts --no-coverage`
Expected: FAIL - "Cannot find module '../toolExecution'"

**Step 3: Write implementation**

Create `src/tools/toolExecution.ts`:

```typescript
import { z } from 'zod';
import type { Tool, ToolDefinition } from './Tool';
import type { ToolContext, ToolResult } from './types';
import { toolExecutionPermissionCheck } from './permissions';

export interface ToolUseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  toolName: string;
  duration?: number;
}

export interface ToolUseOptions {
  signal?: AbortSignal;
  timeout?: number;
}

export async function runToolUse<TInput, TOutput>(
  tool: Tool<TInput, TOutput>,
  input: TInput,
  context: ToolContext,
  options?: ToolUseOptions
): Promise<ToolUseResult<TOutput>> {
  const startTime = Date.now();

  try {
    if (options?.signal?.aborted) {
      return { success: false, error: 'Aborted', toolName: tool.name };
    }

    const result = await Promise.race([
      tool.call(input, context),
      options?.timeout
        ? new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Tool timeout')), options.timeout)
          )
        : new Promise<never>((resolve) => setTimeout(resolve, 999999999)),
    ]);

    return {
      success: true,
      data: result.data,
      toolName: tool.name,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      toolName: tool.name,
      duration: Date.now() - startTime,
    };
  }
}

export type PermissionDecision = 'allow' | 'deny' | 'ask';

export async function checkPermissionsAndCallTool<TInput, TOutput>(
  tool: Tool<TInput, TOutput>,
  input: TInput,
  context: ToolContext,
  permission: PermissionDecision
): Promise<ToolUseResult<TOutput>> {
  if (permission === 'deny') {
    return {
      success: false,
      error: `Permission denied for tool: ${tool.name}`,
      toolName: tool.name,
    };
  }

  return runToolUse(tool, input, context);
}
```

**Step 4: Run test to verify it passes**

Run: `cd D:/Agent/auto-shell && npx jest src/tools/__tests__/toolExecution.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
cd D:/Agent/auto-shell
git add src/tools/toolExecution.ts src/tools/__tests__/toolExecution.test.ts
git commit -m "feat(tools): add tool execution engine with timeout support"
```

---

## Task 3: Add Tool Concurrency Orchestration

**Files:**
- Create: `src/tools/toolOrchestration.ts`
- Create: `src/tools/__tests__/toolOrchestration.test.ts`

**Step 1: Write the failing test**

```typescript
import { Tool, TOOL_DEFAULTS } from '../Tool';
import { ToolContext } from '../types';
import { runTools, partitionToolCalls } from '../toolOrchestration';

const mockProvider = {
  name: 'test',
  isAvailable: async () => true,
  chat: async () => '',
  streamChat: async () => '',
  explainError: async () => '',
  naturalToCommand: async () => '',
  explainCommand: async () => ({ summary: '', parts: [] }),
  suggestCompletion: async () => [],
} as any;

const mockContext: ToolContext = {
  cwd: '/tmp',
  shell: 'bash',
  aiProvider: mockProvider,
};

describe('Tool Orchestration', () => {
  it('should partition tools into concurrent and serial groups', () => {
    const readTool = {
      ...TOOL_DEFAULTS,
      name: 'Read',
      isConcurrencySafe: () => true,
      isReadOnly: () => true,
      call: async () => ({ data: 'content' }),
    } as Tool<{ path: string }, string>;

    const writeTool = {
      ...TOOL_DEFAULTS,
      name: 'Write',
      isConcurrencySafe: () => false,
      isReadOnly: () => false,
      call: async () => ({ data: 'ok' }),
    } as Tool<{ path: string; content: string }, string>;

    const calls = [
      { tool: readTool, input: { path: 'a.txt' } },
      { tool: writeTool, input: { path: 'b.txt', content: 'x' } },
      { tool: readTool, input: { path: 'c.txt' } },
    ];

    const partitions = partitionToolCalls(calls);
    expect(partitions.concurrent.length).toBe(2); // Read tools
    expect(partitions.serial.length).toBe(1); // Write tool
  });

  it('should run read-only tools concurrently', async () => {
    const readTool = {
      ...TOOL_DEFAULTS,
      name: 'Read',
      isConcurrencySafe: () => true,
      isReadOnly: () => true,
      call: async () => {
        await new Promise((r) => setTimeout(r, 50));
        return { data: 'content' };
      },
    } as Tool<{ path: string }, string>;

    const calls = [
      { tool: readTool, input: { path: 'a.txt' } },
      { tool: readTool, input: { path: 'b.txt' } },
    ];

    const start = Date.now();
    const results = await runTools(calls, mockContext);
    const duration = Date.now() - start;

    expect(results.every((r) => r.success)).toBe(true);
    expect(duration).toBeLessThan(100); // Should run concurrently
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd D:/Agent/auto-shell && npx jest src/tools/__tests__/toolOrchestration.test.ts --no-coverage`
Expected: FAIL - "Cannot find module '../toolOrchestration'"

**Step 3: Write implementation**

Create `src/tools/toolOrchestration.ts`:

```typescript
import type { Tool } from './Tool';
import type { ToolContext, ToolResult } from './types';
import { runToolUse, ToolUseResult } from './toolExecution';

export interface ToolCall<TInput = unknown> {
  tool: Tool<TInput, unknown>;
  input: TInput;
}

export interface ToolPartitionResult {
  concurrent: ToolCall[];
  serial: ToolCall[];
}

export function partitionToolCalls<TInput>(calls: ToolCall<TInput>[]): ToolPartitionResult {
  const concurrent: ToolCall[] = [];
  const serial: ToolCall[] = [];

  for (const call of calls) {
    if (call.tool.isConcurrencySafe(call.input)) {
      concurrent.push(call);
    } else {
      serial.push(call);
    }
  }

  return { concurrent, serial };
}

export async function runTools<TInput>(
  calls: ToolCall<TInput>[],
  context: ToolContext,
  options?: { timeout?: number }
): Promise<ToolUseResult<unknown>[]> {
  const partitions = partitionToolCalls(calls);
  const results: ToolUseResult<unknown>[] = [];

  // Run all concurrent (read-only) tools in parallel
  const concurrentPromises = partitions.concurrent.map((call) =>
    runToolUse(call.tool, call.input, context, options)
  );

  // Run serial tools one by one
  const serialPromises = partitions.serial.map((call) =>
    runToolUse(call.tool, call.input, context, options)
  );

  const concurrentResults = await Promise.all(concurrentPromises);
  const serialResults: ToolUseResult<unknown>[] = [];

  for (const promise of serialPromises) {
    serialResults.push(await promise);
  }

  results.push(...concurrentResults, ...serialResults);
  return results;
}
```

**Step 4: Run test to verify it passes**

Run: `cd D:/Agent/auto-shell && npx jest src/tools/__tests__/toolOrchestration.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
cd D:/Agent/auto-shell
git add src/tools/toolOrchestration.ts src/tools/__tests__/toolOrchestration.test.ts
git commit -m "feat(tools): add tool orchestration with concurrent/serial partitioning"
```

---

## Task 4: Add Permission System

**Files:**
- Create: `src/tools/permissions.ts`
- Create: `src/tools/__tests__/permissions.test.ts`

**Step 1: Write the failing test**

```typescript
import { toolExecutionPermissionCheck } from '../permissions';

describe('Permission System', () => {
  it('should allow when mode is bypassPermissions', () => {
    expect(toolExecutionPermissionCheck('bypassPermissions', 'Write')).toBe('allow');
  });

  it('should deny when mode is dontAsk', () => {
    expect(toolExecutionPermissionCheck('dontAsk', 'Write')).toBe('deny');
  });

  it('should ask for unknown dangerous tools in default mode', () => {
    expect(toolExecutionPermissionCheck('default', 'Write')).toBe('ask');
  });

  it('should auto-allow safe read-only tools', () => {
    expect(toolExecutionPermissionCheck('default', 'Read')).toBe('allow');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd D:/Agent/auto-shell && npx jest src/tools/__tests__/permissions.test.ts --no-coverage`
Expected: FAIL - "Cannot find module '../permissions'"

**Step 3: Write implementation**

Create `src/tools/permissions.ts`:

```typescript
export type PermissionMode =
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'default'
  | 'dontAsk'
  | 'plan'
  | 'auto';

export type PermissionDecision = 'allow' | 'deny' | 'ask';

// Tools that are considered safe and auto-allowed
const SAFE_TOOLS = new Set(['Read', 'Explain', 'ExplainError', 'ExplainCommand', 'NaturalToCommand']);

// Tools that are considered dangerous (write/modify)
const DANGEROUS_TOOLS = new Set(['Write', 'Edit', 'Delete', 'Mkdir', 'Rmdir', 'Execute']);

function isToolSafe(toolName: string): boolean {
  const lower = toolName.toLowerCase();
  if (SAFE_TOOLS.has(toolName)) return true;
  if (DANGEROUS_TOOLS.has(toolName)) return false;
  // Default: assume read-only tools are safe
  return lower.startsWith('read') || lower.startsWith('list') || lower.startsWith('search');
}

export function toolExecutionPermissionCheck(
  mode: PermissionMode,
  toolName: string,
  _toolInput?: unknown
): PermissionDecision {
  switch (mode) {
    case 'bypassPermissions':
      return 'allow';

    case 'dontAsk':
      return 'deny';

    case 'acceptEdits':
      // Only allow safe edit tools
      if (isToolSafe(toolName)) return 'allow';
      return 'ask';

    case 'plan':
      // In plan mode, never execute tools automatically
      return 'ask';

    case 'auto':
      // AI classifier decides (placeholder for future ML-based classifier)
      if (isToolSafe(toolName)) return 'allow';
      return 'ask';

    case 'default':
    default:
      if (isToolSafe(toolName)) return 'allow';
      return 'ask';
  }
}

export interface PermissionContext {
  mode: PermissionMode;
  toolName: string;
  toolInput?: unknown;
  cwd?: string;
  shell?: string;
}

export function checkPermission(context: PermissionContext): PermissionDecision {
  return toolExecutionPermissionCheck(context.mode, context.toolName, context.toolInput);
}
```

**Step 4: Run test to verify it passes**

Run: `cd D:/Agent/auto-shell && npx jest src/tools/__tests__/permissions.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
cd D:/Agent/auto-shell
git add src/tools/permissions.ts src/tools/__tests__/permissions.test.ts
git commit -m "feat(tools): add permission system with rule-based access control"
```

---

## Task 5: Add Hooks System

**Files:**
- Create: `src/tools/hooks.ts`
- Create: `src/tools/__tests__/hooks.test.ts`

**Step 1: Write the failing test**

```typescript
import { executePreToolHooks, executePostToolHooks } from '../hooks';

describe('Hooks System', () => {
  it('should execute pre-tool hooks', async () => {
    let called = false;
    const hooks = [
      {
        type: 'PreToolUse' as const,
        name: 'TestHook',
        call: async () => { called = true; },
      },
    ];

    await executePreToolHooks(hooks, 'Read', { path: 'test.txt' });
    expect(called).toBe(true);
  });

  it('should execute post-tool hooks on success', async () => {
    let called = false;
    const hooks = [
      {
        type: 'PostToolUse' as const,
        name: 'TestHook',
        call: async () => { called = true; },
      },
    ];

    await executePostToolHooks(hooks, 'Read', { path: 'test.txt' }, { success: true, data: 'content' });
    expect(called).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd D:/Agent/auto-shell && npx jest src/tools/__tests__/hooks.test.ts --no-coverage`
Expected: FAIL - "Cannot find module '../hooks'"

**Step 3: Write implementation**

Create `src/tools/hooks.ts`:

```typescript
import type { ToolUseResult } from './toolExecution';

export type HookType =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'PreCompact'
  | 'PostCompact'
  | 'SessionStart'
  | 'SessionEnd'
  | 'PermissionRequest';

export interface ToolHook {
  type: 'PreToolUse' | 'PostToolUse' | 'PostToolUseFailure';
  name: string;
  call: (toolName: string, input: unknown) => Promise<void>;
}

export interface SessionHook {
  type: 'SessionStart' | 'SessionEnd';
  name: string;
  call: (context: { cwd: string; shell: string }) => Promise<void>;
}

export type Hook = ToolHook | SessionHook;

export async function executePreToolHooks(
  hooks: ToolHook[],
  toolName: string,
  input: unknown
): Promise<void> {
  const preHooks = hooks.filter((h) => h.type === 'PreToolUse');
  await Promise.all(preHooks.map((hook) => hook.call(toolName, input)));
}

export async function executePostToolHooks(
  hooks: ToolHook[],
  toolName: string,
  input: unknown,
  result: ToolUseResult<unknown>
): Promise<void> {
  const hookType = result.success ? 'PostToolUse' : 'PostToolUseFailure';
  const postHooks = hooks.filter((h) => h.type === hookType);
  await Promise.all(postHooks.map((hook) => hook.call(toolName, input)));
}

export async function executeSessionHooks(
  hooks: SessionHook[],
  type: 'SessionStart' | 'SessionEnd',
  context: { cwd: string; shell: string }
): Promise<void> {
  const sessionHooks = hooks.filter((h) => h.type === type);
  await Promise.all(sessionHooks.map((hook) => hook.call(context)));
}
```

**Step 4: Run test to verify it passes**

Run: `cd D:/Agent/auto-shell && npx jest src/tools/__tests__/hooks.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
cd D:/Agent/auto-shell
git add src/tools/hooks.ts src/tools/__tests__/hooks.test.ts
git commit -m "feat(tools): add hooks system for lifecycle events"
```

---

## Task 6: Add File System Tools (Read, Write, Edit, Glob)

**Files:**
- Create: `src/tools/base/FileTools.ts`
- Modify: `src/tools/base/index.ts`

**Step 1: Write the failing test**

```typescript
import { ReadTool, WriteTool, GlobTool } from '../base/FileTools';
import { ToolContext } from '../types';

const mockProvider = {
  name: 'test',
  isAvailable: async () => true,
  chat: async () => '',
  streamChat: async () => '',
  explainError: async () => '',
  naturalToCommand: async () => '',
  explainCommand: async () => ({ summary: '', parts: [] }),
  suggestCompletion: async () => [],
} as any;

const mockContext: ToolContext = {
  cwd: process.cwd(),
  shell: 'bash',
  aiProvider: mockProvider,
};

describe('FileTools', () => {
  it('should read file contents', async () => {
    const tool = new ReadTool();
    const result = await tool.call({ path: 'package.json' }, mockContext);
    expect(result.data).toContain('name');
  });

  it('should glob files', async () => {
    const tool = new GlobTool();
    const result = await tool.call({ pattern: '*.ts' }, mockContext);
    expect(result.data.files.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd D:/Agent/auto-shell && npx jest src/tools/__tests__/fileTools.test.ts --no-coverage`
Expected: FAIL - "Cannot find module '../base/FileTools'"

**Step 3: Write implementation**

Create `src/tools/base/FileTools.ts`:

```typescript
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseTool } from './BaseTool';
import type { ToolResult } from '../types';

// Schemas
const ReadInputSchema = z.object({
  path: z.string(),
  encoding: z.enum(['utf-8', 'base64']).optional().default('utf-8'),
});

const WriteInputSchema = z.object({
  path: z.string(),
  content: z.string(),
  encoding: z.enum(['utf-8', 'base64']).optional().default('utf-8'),
});

const GlobInputSchema = z.object({
  pattern: z.string(),
  cwd: z.string().optional(),
});

const EditInputSchema = z.object({
  path: z.string(),
  search: z.string(),
  replace: z.string(),
});

// Tool Implementations
export class ReadTool extends BaseTool {
  name = 'Read';
  description = 'Read the contents of a file from the filesystem';
  inputSchema = ReadInputSchema;

  async call(args: z.infer<typeof ReadInputSchema>, context: ToolContext): Promise<ToolResult<{ content: string; path: string }>> {
    try {
      const fullPath = path.isAbsolute(args.path) ? args.path : path.join(context.cwd, args.path);
      const content = await fs.readFile(fullPath, args.encoding as BufferEncoding);
      return { data: { content: String(content), path: fullPath } };
    } catch (error) {
      return { data: { content: '', path: args.path }, error: String(error) };
    }
  }

  isReadOnly() { return true; }
  isConcurrencySafe() { return true; }
}

export class WriteTool extends BaseTool {
  name = 'Write';
  description = 'Write content to a file, creating it if it does not exist';
  inputSchema = WriteInputSchema;

  async call(args: z.infer<typeof WriteInputSchema>, context: ToolContext): Promise<ToolResult<{ path: string; bytes: number }>> {
    try {
      const fullPath = path.isAbsolute(args.path) ? args.path : path.join(context.cwd, args.path);
      await fs.writeFile(fullPath, args.content, args.encoding as BufferEncoding);
      return { data: { path: fullPath, bytes: Buffer.byteLength(args.content) } };
    } catch (error) {
      return { data: { path: args.path, bytes: 0 }, error: String(error) };
    }
  }

  isReadOnly() { return false; }
  isConcurrencySafe() { return false; }
}

export class GlobTool extends BaseTool {
  name = 'Glob';
  description = 'Find files matching a glob pattern';
  inputSchema = GlobInputSchema;

  async call(args: z.infer<typeof GlobInputSchema>, context: ToolContext): Promise<ToolResult<{ files: string[]; pattern: string }>> {
    try {
      // Simple glob implementation using fs.readdir
      const cwd = args.cwd || context.cwd;
      const pattern = args.pattern;
      const files = await this.glob(cwd, pattern);
      return { data: { files, pattern } };
    } catch (error) {
      return { data: { files: [], pattern: args.pattern }, error: String(error) };
    }
  }

  private async glob(cwd: string, pattern: string): Promise<string[]> {
    const results: string[] = [];
    const { globToRegex } = await import('../globToRegex');
    const regex = globToRegex(pattern);
    await this.walkDir(cwd, regex, results);
    return results;
  }

  private async walkDir(dir: string, regex: RegExp, results: string[]): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await this.walkDir(fullPath, regex, results);
        } else if (entry.isFile() && regex.test(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  isReadOnly() { return true; }
  isConcurrencySafe() { return true; }
}

export class EditTool extends BaseTool {
  name = 'Edit';
  description = 'Edit a file by replacing text';
  inputSchema = EditInputSchema;

  async call(args: z.infer<typeof EditInputSchema>, context: ToolContext): Promise<ToolResult<{ path: string; replacements: number }>> {
    try {
      const fullPath = path.isAbsolute(args.path) ? args.path : path.join(context.cwd, args.path);
      let content = await fs.readFile(fullPath, 'utf-8');
      const matches = content.split(args.search).length - 1;
      content = content.split(args.search).join(args.replace);
      await fs.writeFile(fullPath, content, 'utf-8');
      return { data: { path: fullPath, replacements: matches } };
    } catch (error) {
      return { data: { path: args.path, replacements: 0 }, error: String(error) };
    }
  }

  isReadOnly() { return false; }
  isConcurrencySafe() { return false; }
}
```

**Step 4: Run test to verify it passes**

Run: `cd D:/Agent/auto-shell && npx jest src/tools/__tests__/fileTools.test.ts --no-coverage`
Expected: PASS (may need to create globToRegex helper)

**Step 5: Commit**

```bash
cd D:/Agent/auto-shell
git add src/tools/base/FileTools.ts src/tools/__tests__/fileTools.test.ts
git commit -m "feat(tools): add file system tools (Read, Write, Edit, Glob)"
```

---

## Task 7: Add Git Tool

**Files:**
- Create: `src/tools/base/GitTool.ts`
- Modify: `src/tools/base/index.ts`

**Step 1: Write the failing test**

```typescript
import { GitTool } from '../base/GitTool';
import { ToolContext } from '../types';

const mockProvider = {
  name: 'test',
  isAvailable: async () => true,
  chat: async () => '',
  streamChat: async () => '',
  explainError: async () => '',
  naturalToCommand: async () => '',
  explainCommand: async () => ({ summary: '', parts: [] }),
  suggestCompletion: async () => [],
} as any;

const mockContext: ToolContext = {
  cwd: process.cwd(),
  shell: 'bash',
  aiProvider: mockProvider,
};

describe('GitTool', () => {
  it('should get git status', async () => {
    const tool = new GitTool();
    const result = await tool.call({ operation: 'status' }, mockContext);
    expect(result.data).toBeDefined();
  });

  it('should get git diff', async () => {
    const tool = new GitTool();
    const result = await tool.call({ operation: 'diff' }, mockContext);
    expect(result.data).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd D:/Agent/auto-shell && npx jest src/tools/__tests__/gitTool.test.ts --no-coverage`
Expected: FAIL

**Step 3: Write implementation**

Create `src/tools/base/GitTool.ts`:

```typescript
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseTool } from './BaseTool';
import type { ToolResult } from '../types';

const execAsync = promisify(exec);

const GitInputSchema = z.object({
  operation: z.enum(['status', 'diff', 'log', 'branch', 'checkout', 'commit']),
  args: z.record(z.string()).optional(),
  message: z.string().optional(),
});

export class GitTool extends BaseTool {
  name = 'Bash';
  description = 'Execute git commands (git status, diff, log, branch, checkout, commit)';
  inputSchema = GitInputSchema;

  async call(args: z.infer<typeof GitInputSchema>, context: ToolContext): Promise<ToolResult<{ stdout: string; stderr: string; exitCode: number }>> {
    try {
      let command: string;
      switch (args.operation) {
        case 'status':
          command = 'git status';
          break;
        case 'diff':
          command = 'git diff';
          break;
        case 'log':
          command = `git log --oneline -${args.args?.n || 10}`;
          break;
        case 'branch':
          command = 'git branch -a';
          break;
        case 'checkout':
          command = `git checkout ${args.args?.branch || ''}`;
          break;
        case 'commit':
          command = `git commit -m "${args.message || ''}"`;
          break;
        default:
          return { data: { stdout: '', stderr: 'Unknown operation', exitCode: 1 } };
      }

      const { stdout, stderr } = await execAsync(command, { cwd: context.cwd });
      return { data: { stdout, stderr, exitCode: 0 } };
    } catch (error: any) {
      return { data: { stdout: '', stderr: error.stderr || String(error), exitCode: error.code || 1 } };
    }
  }

  isReadOnly() {
    return false; // Some operations modify state
  }

  isConcurrencySafe(input: z.infer<typeof GitInputSchema>) {
    return input.operation === 'status' || input.operation === 'diff' || input.operation === 'log';
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd D:/Agent/auto-shell && npx jest src/tools/__tests__/gitTool.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
cd D:/Agent/auto-shell
git add src/tools/base/GitTool.ts src/tools/__tests__/gitTool.test.ts
git commit -m "feat(tools): add Git tool for version control operations"
```

---

## Task 8: Register All Tools in ToolRegistry

**Files:**
- Modify: `src/tools/base/index.ts`

**Step 1: Update registration**

Modify `src/tools/base/index.ts`:

```typescript
import { globalToolRegistry } from '../ToolRegistry';
import { ExplainErrorTool } from './ExplainErrorTool';
import { NaturalToCommandTool } from './NaturalToCommandTool';
import { ExplainCommandTool } from './ExplainCommandTool';
import { ReadTool, WriteTool, EditTool, GlobTool } from './FileTools';
import { GitTool } from './GitTool';

export function registerBuiltinTools(): void {
  // Original tools
  globalToolRegistry.registerTool(new ExplainErrorTool());
  globalToolRegistry.registerTool(new NaturalToCommandTool());
  globalToolRegistry.registerTool(new ExplainCommandTool());

  // New file tools
  globalToolRegistry.registerTool(new ReadTool());
  globalToolRegistry.registerTool(new WriteTool());
  globalToolRegistry.registerTool(new EditTool());
  globalToolRegistry.registerTool(new GlobTool());

  // Git tool
  globalToolRegistry.registerTool(new GitTool());

  console.log(
    `[Tools] Registered ${globalToolRegistry.getToolCount()} builtin tools:`,
    globalToolRegistry.getToolNames().join(', '),
  );
}
```

**Step 2: Verify registration**

Run: `cd D:/Agent/auto-shell && npm run dev` and check console for registered tools

**Step 3: Commit**

```bash
cd D:/Agent/auto-shell
git add src/tools/base/index.ts
git commit -m "feat(tools): register all built-in tools including file and git tools"
```

---

## Task 9: Integrate Tool System with AI Provider

**Files:**
- Modify: `src/ai/provider.ts`
- Create: `src/ai/toolCalling.ts`
- Modify: `src/main/ipc-handlers.ts`

**Step 1: Add tool calling support to AIProvider**

Modify `src/ai/provider.ts`:

```typescript
import type { Tool } from '../tools/Tool';
import type { ToolCall } from '../tools/toolOrchestration';

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  chat(messages: ChatMessage[]): Promise<string>;
  streamChat(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string>;
  explainError(ctx: ErrorContext): Promise<string>;
  naturalToCommand(input: string, shell: string): Promise<string>;
  explainCommand(command: string): Promise<CommandExplanation>;
  suggestCompletion(ctx: CompletionContext): Promise<Suggestion[]>;
  // New: Tool calling support
  getToolDefinitions(): Tool<unknown, unknown>[];
  callWithTools(messages: ChatMessage[], tools: ToolCall[]): Promise<{ message: ChatMessage; toolResults: any[] }>;
}
```

**Step 2: Implement tool calling in ClaudeProvider**

Modify `src/ai/claude-provider.ts` to support structured tool calls using Claude's tool_use feature

**Step 3: Register IPC handler for tool execution**

Modify `src/main/ipc-handlers.ts`:

```typescript
import { globalToolRegistry } from '../tools/ToolRegistry';
import { runTools } from '../tools/toolOrchestration';
import { checkPermissionsAndCallTool } from '../tools/permissions';

ipcMain.handle('tools:execute', async (event, { toolCalls, permissionMode }) => {
  const provider = getProvider();
  const context = { cwd: event.sender.getOwnerInstanceId?.() || process.cwd(), shell: 'bash', aiProvider: provider };

  const results = [];
  for (const { toolName, input } of toolCalls) {
    const tool = globalToolRegistry.get(toolName);
    if (!tool) {
      results.push({ success: false, error: `Tool not found: ${toolName}` });
      continue;
    }
    const result = await checkPermissionsAndCallTool(tool, input, context, permissionMode);
    results.push(result);
  }
  return results;
});

ipcMain.handle('tools:list', async () => {
  return globalToolRegistry.getToolNames();
});
```

**Step 4: Commit**

```bash
cd D:/Agent/auto-shell
git add src/ai/provider.ts src/ai/toolCalling.ts src/main/ipc-handlers.ts
git commit -m "feat(ai): integrate tool system with AI provider for structured tool calling"
```

---

## Summary

### New Files Created:
```
src/tools/
├── __tests__/
│   ├── tool-schema.test.ts
│   ├── toolExecution.test.ts
│   ├── toolOrchestration.test.ts
│   ├── permissions.test.ts
│   ├── hooks.test.ts
│   ├── fileTools.test.ts
│   └── gitTool.test.ts
├── permissions.ts
├── toolExecution.ts
├── toolOrchestration.ts
├── hooks.ts
└── base/
    ├── FileTools.ts
    └── GitTool.ts
```

### Modified Files:
```
src/tools/
├── Tool.ts           # Added InputSchema support
├── types.ts         # Extended ToolResult with error field
├── buildTool.ts     # Updated type definition
└── base/
    └── index.ts     # Register all new tools
src/ai/
├── provider.ts      # Added tool calling interface
└── toolCalling.ts   # Tool calling implementation
src/main/
└── ipc-handlers.ts  # Added tools:execute and tools:list handlers
```

### Dependencies Added:
- `zod` - Schema validation for tool inputs

---

## Plan complete.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
