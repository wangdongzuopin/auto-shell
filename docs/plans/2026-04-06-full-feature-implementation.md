# Full Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement all missing features in auto-shell to match claude-code-rev's core functionality: skills system, session persistence, file tools, and MCP support.

**Architecture:**
- Skills: Load from `~/.claude/skills/` via main process IPC
- Session Persistence: Save threads to `~/.autoshell/sessions/` as JSON
- Tools: File read/write, Bash execution, Grep, Glob via main process IPC
- MCP: STDIO-based MCP client connecting to local MCP servers

**Tech Stack:** Electron + React + TypeScript + Zustand + node-pty + fs

---

## Task 1: Complete Skills System (Disk Loading + AI Integration)

### Task 1.1: Verify skill disk loading works

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload.ts`
- Modify: `src/renderer/stores/skillStore.ts`
- Modify: `src/shared/ipc-channels.ts`

**Step 1: Rebuild and test skill loading**

Run: `cd D:/Agent/auto-shell && rm -rf dist && npm run build`

Verify: Check `dist/main/index.js` contains `loadSkillsFromDisk` and `SKILLS_GET_ALL`

**Step 2: Add skill loading on app start**

Modify `src/renderer/stores/skillStore.ts` to call `loadSkillsFromDisk()` on initialization.

**Step 3: Verify AI sees skills in conversation**

Test by asking "你有什么技能？" - AI should list skills from disk.

### Task 1.2: Add skill execution capability

**Files:**
- Create: `src/main/tools/file-tools.ts`
- Create: `src/main/tools/bash-tool.ts`
- Modify: `src/shared/ipc-channels.ts`
- Modify: `src/preload.ts`

**Step 1: Create file read tool**

```typescript
// src/main/tools/file-tools.ts
import * as fs from 'fs';
import * as path from 'path';

export const fileReadTool = {
  name: 'Read',
  description: 'Read contents of a file',
  call: async (filePath: string) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content;
    } catch (e) {
      return `Error reading file: ${e.message}`;
    }
  }
};

export const fileWriteTool = {
  name: 'Write',
  description: 'Write content to a file',
  call: async (filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return 'File written successfully';
    } catch (e) {
      return `Error writing file: ${e.message}`;
    }
  }
};
```

**Step 2: Create bash execution tool**

```typescript
// src/main/tools/bash-tool.ts
import { ipcMain } from 'electron';

export function registerBashTool() {
  ipcMain.handle('tool:bash', async (_event, command: string, cwd: string) => {
    // Use node-pty to execute command
    // Return stdout + stderr
  });
}
```

**Step 3: Register tool IPC channels**

Add to `ipc-channels.ts`:
```typescript
TOOL_BASH: 'tool:bash',
TOOL_READ: 'tool:read',
TOOL_WRITE: 'tool:write',
TOOL_GLOB: 'tool:glob',
TOOL_GREP: 'tool:grep',
```

### Task 1.3: Integrate tools into AI chat

**Files:**
- Modify: `src/ai/prompts.ts`
- Modify: `src/renderer/hooks/useAI.ts`

**Step 1: Update system prompt to include available tools**

```typescript
// src/ai/prompts.ts
export const SYSTEM_PROMPT = `你是一个AI助手，有以下工具可用：
- Read(filePath): 读取文件
- Write(filePath, content): 写入文件
- Bash(command): 执行终端命令
- Glob(pattern): 查找匹配模式的文件
- Grep(pattern, path): 在目录中搜索内容

当用户要求读取、创建或修改文件时，使用对应工具。
`;
```

**Step 2: Modify useAI hook to pass tools context**

Update streaming chat to include tools in the request.

---

## Task 2: Session Persistence

### Task 2.1: Save sessions to disk

**Files:**
- Create: `src/main/session-persistence.ts`
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/shared/ipc-channels.ts`
- Modify: `src/preload.ts`

**Step 1: Create session persistence module**

```typescript
// src/main/session-persistence.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const SESSIONS_DIR = path.join(os.homedir(), '.autoshell', 'sessions');

export function getSessionsDir(): string {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
  return SESSIONS_DIR;
}

export function saveSession(threadId: string, data: any): void {
  const filePath = path.join(getSessionsDir(), `${threadId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function loadSession(threadId: string): any | null {
  const filePath = path.join(getSessionsDir(), `${threadId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function listSessions(): string[] {
  if (!fs.existsSync(getSessionsDir())) return [];
  return fs.readdirSync(getSessionsDir())
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

export function deleteSession(threadId: string): void {
  const filePath = path.join(getSessionsDir(), `${threadId}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
```

**Step 2: Register session IPC handlers**

```typescript
// src/main/ipc-handlers.ts
ipcMain.handle(IPC.SESSION_SAVE, (_event, threadId, data) => {
  saveSession(threadId, data);
  return true;
});

ipcMain.handle(IPC.SESSION_LOAD, (_event, threadId) => {
  return loadSession(threadId);
});

ipcMain.handle(IPC.SESSION_LIST, () => {
  return listSessions();
});

ipcMain.handle(IPC.SESSION_DELETE, (_event, threadId) => {
  deleteSession(threadId);
  return true;
});
```

**Step 3: Add IPC channels**

```typescript
// src/shared/ipc-channels.ts
SESSION_SAVE: 'session:save',
SESSION_LOAD: 'session:load',
SESSION_LIST: 'session:list',
SESSION_DELETE: 'session:delete',
```

**Step 4: Expose in preload**

```typescript
// src/preload.ts
saveSession: (threadId, data) => ipcRenderer.invoke(IPC.SESSION_SAVE, threadId, data),
loadSession: (threadId) => ipcRenderer.invoke(IPC.SESSION_LOAD, threadId),
listSessions: () => ipcRenderer.invoke(IPC.SESSION_LIST),
deleteSession: (threadId) => ipcRenderer.invoke(IPC.SESSION_DELETE, threadId),
```

### Task 2.2: Integrate with chat store

**Files:**
- Modify: `src/renderer/stores/chatStore.ts`

**Step 1: Add auto-save on message changes**

```typescript
// In chatStore, after addMessage, updateMessage, etc.
// call window.api.saveSession(threadId, threadData)
```

**Step 2: Load sessions on app start**

```typescript
// On store initialization, load all sessions from disk
const savedSessions = await window.api.listSessions();
```

---

## Task 3: File & Bash Tools

### Task 3.1: File Read/Write Tools

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/shared/ipc-channels.ts`
- Modify: `src/preload.ts`

**Step 1: Add file tool IPC handlers**

```typescript
// src/main/ipc-handlers.ts
ipcMain.handle(IPC.TOOL_READ, async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle(IPC.TOOL_WRITE, async (_event, filePath: string, content: string) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
```

**Step 2: Add glob tool**

```typescript
ipcMain.handle(IPC.TOOL_GLOB, async (_event, pattern: string, cwd: string) => {
  // Use fast-glob or similar
  const { globSync } = require('fast-glob');
  const matches = globSync(pattern, { cwd, absolute: true });
  return matches;
});
```

**Step 3: Add grep tool**

```typescript
ipcMain.handle(IPC.TOOL_GREP, async (_event, pattern: string, cwd: string, options?: { ext?: string[] }) => {
  // Walk directory and grep
  // Return matching files with line numbers
});
```

### Task 3.2: Bash Tool with PTY

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/main/pty-manager.ts` (extend existing)

**Step 1: Add bash tool IPC handler**

```typescript
// src/main/ipc-handlers.ts
ipcMain.handle(IPC.TOOL_BASH, async (_event, command: string, cwd: string) => {
  return new Promise((resolve) => {
    const pty = require('node-pty');
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    
    const p = pty.spawn(shell, [], { cwd });
    let output = '';
    
    p.onData((data: string) => { output += data; });
    p.onExit(({ exitCode }: { exitCode: number }) => {
      resolve({ exitCode, output });
    });
    
    p.write(command + '\r');
  });
});
```

---

## Task 4: MCP Support (Basic)

### Task 4.1: MCP Client Setup

**Files:**
- Create: `src/main/mcp/client.ts`
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/shared/ipc-channels.ts`

**Step 1: Create MCP client**

```typescript
// src/main/mcp/client.ts
import { spawn, ChildProcess } from 'child_process';

export interface MCPServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
}

export class MCPClient {
  private processes: Map<string, ChildProcess> = new Map();
  private tools: Map<string, MCPTool[]> = new Map();

  async connect(server: MCPServer): Promise<MCPTool[]> {
    return new Promise((resolve, reject) => {
      const proc = spawn(server.command, server.args, {
        env: { ...process.env, ...server.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.processes.set(server.name, proc);

      // Send initialize request
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {} }
      };

      proc.stdin.write(JSON.stringify(initRequest) + '\n');
      
      // Handle response and tool list
      let tools: MCPTool[] = [];
      proc.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.result?.tools) {
              tools = msg.result.tools;
              this.tools.set(server.name, tools);
              resolve(tools);
            }
          } catch {}
        }
      });

      proc.on('error', reject);
    });
  }

  async callTool(serverName: string, toolName: string, args: object): Promise<any> {
    const proc = this.processes.get(serverName);
    if (!proc) throw new Error(`MCP server ${serverName} not connected`);

    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: toolName, arguments: args }
      };

      proc.stdin.write(JSON.stringify(request) + '\n');

      proc.stdout.once('data', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          resolve(msg.result);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  disconnect(serverName: string): void {
    const proc = this.processes.get(serverName);
    if (proc) {
      proc.kill();
      this.processes.delete(serverName);
      this.tools.delete(serverName);
    }
  }
}
```

### Task 4.2: MCP Configuration and Loading

**Files:**
- Create: `src/main/mcp/index.ts`
- Modify: `src/main/ipc-handlers.ts`

**Step 1: Create MCP index with server config loading**

```typescript
// src/main/mcp/index.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MCPClient, MCPServer } from './client';

const mcpClient = new MCPClient();

export function getMCPConfigPath(): string {
  return path.join(os.homedir(), '.autoshell', 'mcp-config.json');
}

export interface MCPConfig {
  servers: MCPServer[];
}

export function loadMCPConfig(): MCPConfig {
  const configPath = getMCPConfigPath();
  if (!fs.existsSync(configPath)) {
    return { servers: [] };
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

export async function initializeMCP(): Promise<void> {
  const config = loadMCPConfig();
  for (const server of config.servers) {
    try {
      await mcpClient.connect(server);
      console.log(`MCP server ${server.name} connected`);
    } catch (e) {
      console.error(`Failed to connect MCP server ${server.name}:`, e);
    }
  }
}

export { mcpClient };
```

---

## Task 5: Dynamic System Prompt

### Task 5.1: Build dynamic prompt with skills and tools

**Files:**
- Modify: `src/ai/prompts.ts`
- Modify: `src/renderer/stores/skillStore.ts`

**Step 1: Create dynamic prompt builder**

```typescript
// src/ai/prompts.ts

export function buildSystemPrompt(): string {
  const skills = useSkillStore.getState().skills.filter(s => s.enabled);
  
  let prompt = `你是一个AI助手。

## 可用技能
${skills.map(s => `- ${s.name}: ${s.description}`).join('\n')}

## 可用工具
- Read(filePath): 读取文件内容
- Write(filePath, content): 写入文件
- Bash(command, cwd?): 执行终端命令
- Glob(pattern, cwd?): 查找匹配的文件
- Grep(pattern, cwd?): 搜索文件内容

`;

  return prompt;
}

export const SYSTEM_PROMPT = buildSystemPrompt();
```

**Step 2: Update prompts to include context**

```typescript
// Modify streaming chat to send system prompt with skills
const messagesWithContext = [
  { role: 'system', content: buildSystemPrompt() },
  ...messages
];
```

---

## Task 6: SkillsPage - Load Skills from Disk on Mount

### Task 6.1: Auto-load skills when SkillsPage mounts

**Files:**
- Modify: `src/renderer/pages/SkillsPage.tsx`

**Step 1: Add useEffect to load disk skills**

```typescript
// src/renderer/pages/SkillsPage.tsx
import { useEffect } from 'react';
import { useSkillStore } from '../stores/skillStore';

export const SkillsPage: React.FC = () => {
  const { skills, loadSkillsFromDisk } = useSkillStore();

  useEffect(() => {
    loadSkillsFromDisk();
  }, []);
  
  // ... rest of component
};
```

---

## Task 7: Build and Test

### Task 7.1: Rebuild and verify all features

**Step 1: Clean build**

```bash
cd D:/Agent/auto-shell
rm -rf dist
npm run build
```

**Step 2: Test all features**

1. Skills: Check ~/.claude/skills/ skills appear in UI
2. Session: Create chat, restart app, verify history persists
3. Tools: Ask AI to read a file, verify it works
4. MCP: Add MCP server config, verify connection

---

## Summary of Files to Create/Modify

### Create:
- `src/main/tools/file-tools.ts` - File read/write tools
- `src/main/tools/bash-tool.ts` - Bash execution tool
- `src/main/session-persistence.ts` - Session save/load
- `src/main/mcp/client.ts` - MCP client
- `src/main/mcp/index.ts` - MCP initialization

### Modify:
- `src/main/ipc-handlers.ts` - Add all tool and session handlers
- `src/shared/ipc-channels.ts` - Add all IPC channel constants
- `src/preload.ts` - Expose new APIs to renderer
- `src/renderer/stores/skillStore.ts` - Add loadSkillsFromDisk
- `src/renderer/stores/chatStore.ts` - Add session persistence
- `src/renderer/pages/SkillsPage.tsx` - Auto-load skills on mount
- `src/ai/prompts.ts` - Add dynamic system prompt builder
