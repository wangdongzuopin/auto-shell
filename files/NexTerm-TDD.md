# NexTerm — 技术设计文档 (TDD)

**版本**: v0.2.0  
**状态**: 草稿  
**更新日期**: 2026-03-27

---

## 1. 技术选型

### 1.1 核心框架

| 技术 | 选型 | 理由 |
|---|---|---|
| 桌面框架 | Electron 28+ | 生态成熟，node-pty / xterm.js 原生支持 |
| 语言 | TypeScript 5 | 类型安全，与 Electron 生态契合 |
| 终端仿真 | xterm.js 5 | VSCode 内置终端同款，ANSI 完整支持 |
| PTY 驱动 | node-pty 1.x | Windows PTY 标准实现 |
| UI 框架 | React 18 | 组件化，状态管理清晰 |
| 状态管理 | Zustand | 轻量，无模板代码 |
| 样式 | CSS Modules + CSS Variables | 主题切换零 JS，性能好 |
| AI 调用 | 自研 AIProvider 抽象层 | 统一接口，后端可切换 |
| 本地 AI | Ollama HTTP API | 免费，支持多种开源模型 |
| 配置持久化 | electron-store | JSON，自动处理路径 |
| 密钥存储 | keytar（系统密钥链） | 调用 Windows Credential Manager |
| 打包 | electron-builder | NSIS 安装包，支持自动更新 |

---

## 2. 项目结构

```
nexterm/
├── src/
│   ├── main/
│   │   ├── index.ts               # 入口，BrowserWindow
│   │   ├── pty-manager.ts         # PTY 进程管理
│   │   ├── shell-detector.ts      # 检测已安装 Shell
│   │   ├── windows-integration.ts # 右键菜单、任务栏、通知
│   │   ├── ipc-handlers.ts        # IPC 事件注册
│   │   └── session-store.ts       # 配置持久化
│   │
│   ├── renderer/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── TabBar/
│   │   │   ├── Terminal/          # xterm.js 封装
│   │   │   ├── AICard/            # 报错解析卡片
│   │   │   ├── AICompletion/      # 自然语言输入框
│   │   │   ├── ExplainTooltip/    # 命令解释悬浮卡
│   │   │   ├── QuickCommands/     # 快捷命令面板
│   │   │   └── Settings/          # 设置页（含 AI 配置）
│   │   ├── hooks/
│   │   │   ├── useTerminal.ts
│   │   │   ├── useTheme.ts
│   │   │   └── useAI.ts           # AI 功能统一 hook
│   │   └── store/
│   │       ├── tabs.ts
│   │       ├── settings.ts
│   │       └── ai.ts              # AI 状态（loading、结果）
│   │
│   ├── ai/                        # AI 模块（主进程 + 渲染进程共用）
│   │   ├── provider.ts            # AIProvider 抽象接口
│   │   ├── claude-provider.ts     # Claude API 实现
│   │   ├── openai-provider.ts     # OpenAI API 实现
│   │   ├── ollama-provider.ts     # Ollama 本地实现
│   │   ├── prompts.ts             # 所有 prompt 模板
│   │   └── context-builder.ts     # 构建发送给 AI 的上下文
│   │
│   └── shared/
│       ├── ipc-channels.ts
│       └── types.ts
│
├── assets/
├── electron.vite.config.ts
├── package.json
└── tsconfig.json
```

---

## 3. 架构设计

### 3.1 整体进程模型

```
渲染进程 (React UI)
  ├── Terminal 组件 (xterm.js)
  ├── AICard 组件
  ├── ExplainTooltip 组件
  └── AICompletion 组件
       │
       │  IPC (contextBridge)
       ▼
主进程 (Node.js)
  ├── PtyManager          →  cmd.exe / powershell / wsl
  ├── AIService           →  Claude API / OpenAI / Ollama
  ├── WindowsIntegration  →  Shell 右键菜单、任务栏、通知
  └── SessionStore        →  electron-store + keytar
```

### 3.2 AI 模块架构

AI 模块通过统一抽象层屏蔽不同后端差异，渲染进程只调用统一接口：

```typescript
// ai/provider.ts
export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;

  explainError(ctx: ErrorContext): AsyncGenerator<string>;
  naturalToCommand(input: string, shell: string): AsyncGenerator<string>;
  explainCommand(command: string): Promise<CommandExplanation>;
  suggestCompletion(ctx: CompletionContext): Promise<Suggestion[]>;
}

export interface ErrorContext {
  command: string;       // 执行的命令
  exitCode: number;      // 退出码
  stdout: string;        // 标准输出（最后 50 行）
  stderr: string;        // 错误输出
  shell: string;         // PowerShell / CMD / WSL
  cwd: string;           // 当前工作目录
}

export interface CommandExplanation {
  summary: string;                              // 命令整体说明
  parts: { token: string; meaning: string }[];  // 每个 token 的含义
  variants?: string[];                          // 常见变体
}
```

### 3.3 Provider 实现示例（Ollama）

```typescript
// ai/ollama-provider.ts
export class OllamaProvider implements AIProvider {
  name = 'Ollama';

  constructor(
    private baseUrl: string = 'http://localhost:11434',
    private model: string = 'llama3'
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const r = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      return r.ok;
    } catch { return false; }
  }

  async *explainError(ctx: ErrorContext): AsyncGenerator<string> {
    const prompt = PROMPTS.explainError(ctx);
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt, stream: true }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        const data = JSON.parse(line);
        if (data.response) yield data.response;
      }
    }
  }

  // naturalToCommand、explainCommand、suggestCompletion 同理
}
```

### 3.4 Prompt 模板

所有 prompt 集中管理，方便调优：

```typescript
// ai/prompts.ts
export const PROMPTS = {
  explainError: (ctx: ErrorContext) => `
你是一个 Windows 终端助手。用户在 ${ctx.shell} 中执行了命令并遇到错误。

命令: ${ctx.command}
退出码: ${ctx.exitCode}
错误输出:
${ctx.stderr.slice(-1000)}

请用中文回复，格式严格如下（JSON）：
{
  "reason": "一句话解释错误原因",
  "fixes": [
    { "description": "修复方案描述", "command": "具体命令" },
    ...
  ]
}
只输出 JSON，不要其他内容。`,

  naturalToCommand: (input: string, shell: string) => `
将以下自然语言描述转换为 ${shell} 命令。
只输出命令本身，不要解释。

描述: ${input}
命令:`,

  explainCommand: (command: string) => `
解释以下终端命令，用中文回复，格式为 JSON：
{
  "summary": "命令整体作用（一句话）",
  "parts": [
    { "token": "命令或参数", "meaning": "含义" }
  ]
}

命令: ${command}
只输出 JSON。`,
};
```

---

## 4. 核心功能实现

### 4.1 报错智能解析卡片

报错检测在主进程 PTY 层完成，通过 IPC 推送给渲染进程：

```typescript
// main/pty-manager.ts（关键部分）
instance.onExit(({ exitCode }) => {
  if (exitCode !== 0) {
    // 收集最近的输出作为上下文
    const recentOutput = this.outputBuffers.get(id) ?? '';
    mainWindow.webContents.send(IPC.PTY_ERROR, {
      id,
      exitCode,
      command: this.lastCommands.get(id) ?? '',
      stderr: extractStderr(recentOutput),
      cwd: this.cwdMap.get(id) ?? '',
      shell: this.shellMap.get(id) ?? '',
    });
  }
});
```

渲染进程 AICard 组件接收后触发 AI 分析：

```typescript
// renderer/components/AICard/index.tsx
export function AICard({ errorCtx }: { errorCtx: ErrorContext }) {
  const [result, setResult] = useState<ErrorAnalysis | null>(null);
  const [streaming, setStreaming] = useState('');
  const [open, setOpen] = useState(false);
  const ai = useAI();

  useEffect(() => {
    // 自动触发（可配置）
    ai.explainError(errorCtx).then(setResult);
  }, [errorCtx]);

  return (
    <div className={styles.card}>
      <button className={styles.header} onClick={() => setOpen(!open)}>
        <AIIcon /> AI 解析  <ChevronIcon open={open} />
      </button>
      {open && result && (
        <div className={styles.body}>
          <p className={styles.reason}>{result.reason}</p>
          {result.fixes.map((fix, i) => (
            <div key={i} className={styles.fix}>
              <span>{fix.description}</span>
              <code>{fix.command}</code>
              <button onClick={() => injectCommand(fix.command)}>执行</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.2 自然语言转命令

`#` 触发，独立输入状态：

```typescript
// renderer/components/Terminal/InputBar.tsx
function InputBar({ tabId, shell }: Props) {
  const [value, setValue] = useState('');
  const [nlMode, setNlMode] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const ai = useAI();

  const handleChange = async (val: string) => {
    setValue(val);
    if (val.startsWith('#') && val.length > 2) {
      setNlMode(true);
      const cmd = await ai.naturalToCommand(val.slice(1).trim(), shell);
      setSuggestion(cmd);
    } else {
      setNlMode(false);
      setSuggestion('');
    }
  };

  const handleSubmit = () => {
    // 自然语言模式：把生成的命令写入输入框等待确认，不直接执行
    if (nlMode && suggestion) {
      setValue(suggestion);
      setNlMode(false);
    } else {
      window.api.ptyInput(tabId, value + '\r');
      setValue('');
    }
  };

  return (
    <div className={styles.bar}>
      <span className={nlMode ? styles.nlPrompt : styles.prompt}>
        {nlMode ? '#' : '❯'}
      </span>
      <input value={value} onChange={e => handleChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
      {nlMode && suggestion && (
        <div className={styles.suggestion}>
          <code>{suggestion}</code>
          <span className={styles.hint}>Enter 确认 · Esc 取消</span>
        </div>
      )}
    </div>
  );
}
```

### 4.3 命令解释悬浮卡

监听终端内的文本选中事件：

```typescript
// renderer/hooks/useExplainTooltip.ts
export function useExplainTooltip(termRef: React.RefObject<Terminal>) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const ai = useAI();

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    term.onSelectionChange(async () => {
      const selected = term.getSelection().trim();
      if (!selected || selected.length < 3) { setTooltip(null); return; }

      // 判断是否像命令（简单启发：包含空格或以字母开头）
      if (!/^[a-zA-Z]/.test(selected)) return;

      setTooltip({ text: selected, loading: true, data: null });
      const data = await ai.explainCommand(selected);
      setTooltip({ text: selected, loading: false, data });
    });
  }, []);

  return tooltip;
}
```

### 4.4 Windows 深度集成

```typescript
// main/windows-integration.ts
import { app, Menu, Tray, Notification } from 'electron';
import { execSync } from 'child_process';

export class WindowsIntegration {
  // 注册右键菜单（写注册表）
  registerShellContextMenu() {
    const exePath = process.execPath;
    const commands = [
      `reg add "HKCU\\Software\\Classes\\Directory\\shell\\NexTerm" /ve /d "在 NexTerm 中打开" /f`,
      `reg add "HKCU\\Software\\Classes\\Directory\\shell\\NexTerm\\command" /ve /d "\\"${exePath}\\" \\"%V\\"" /f`,
      `reg add "HKCU\\Software\\Classes\\Directory\\Background\\shell\\NexTerm" /ve /d "在 NexTerm 中打开" /f`,
      `reg add "HKCU\\Software\\Classes\\Directory\\Background\\shell\\NexTerm\\command" /ve /d "\\"${exePath}\\" \\"%V\\"" /f`,
    ];
    commands.forEach(cmd => execSync(cmd));
  }

  // 命令完成通知
  notifyCommandDone(command: string, durationMs: number) {
    if (durationMs < 10000) return; // 少于 10 秒不通知
    new Notification({
      title: 'NexTerm — 命令完成',
      body: `${command.slice(0, 60)} (${(durationMs / 1000).toFixed(1)}s)`,
      icon: path.join(__dirname, '../assets/icon.png'),
    }).show();
  }

  // 跟随系统深色模式
  watchDarkMode(onChange: (isDark: boolean) => void) {
    const { nativeTheme } = require('electron');
    nativeTheme.on('updated', () => onChange(nativeTheme.shouldUseDarkColors));
  }
}
```

### 4.5 密钥安全存储

```typescript
// main/session-store.ts
import * as keytar from 'keytar';

const SERVICE = 'NexTerm';

export async function saveApiKey(provider: string, key: string) {
  await keytar.setPassword(SERVICE, provider, key);
}

export async function getApiKey(provider: string): Promise<string | null> {
  return keytar.getPassword(SERVICE, provider);
}

export async function deleteApiKey(provider: string) {
  await keytar.deletePassword(SERVICE, provider);
}
```

---

## 5. IPC 频道设计

```typescript
// shared/ipc-channels.ts
export const IPC = {
  // PTY
  PTY_CREATE:  'pty:create',
  PTY_INPUT:   'pty:input',
  PTY_RESIZE:  'pty:resize',
  PTY_KILL:    'pty:kill',
  PTY_OUTPUT:  'pty:output',
  PTY_EXIT:    'pty:exit',
  PTY_ERROR:   'pty:error',      // 新增：非 0 退出码事件

  // AI
  AI_EXPLAIN_ERROR:   'ai:explain-error',
  AI_NATURAL_CMD:     'ai:natural-cmd',
  AI_EXPLAIN_CMD:     'ai:explain-cmd',
  AI_COMPLETION:      'ai:completion',
  AI_STREAM_CHUNK:    'ai:stream-chunk',   // 流式输出
  AI_STREAM_DONE:     'ai:stream-done',

  // 配置
  CONFIG_GET:  'config:get',
  CONFIG_SET:  'config:set',
  KEY_SAVE:    'key:save',
  KEY_GET:     'key:get',

  // Windows 集成
  WIN_REGISTER_MENU:  'win:register-menu',
  WIN_NOTIFY:         'win:notify',
} as const;
```

---

## 6. 安全策略

```typescript
// main/index.ts
new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,     // 渲染进程不能直接用 Node.js
    contextIsolation: true,     // 隔离上下文
    sandbox: false,             // node-pty preload 需要
    preload: path.join(__dirname, 'preload.js'),
  },
});
```

AI 相关安全约定：
- API Key 只在主进程持有，渲染进程通过 IPC 请求 AI，不直接拿 Key
- 发送给 AI 的上下文做截断（最多 2000 字符），避免意外泄露大量命令历史
- 本地模型（Ollama）模式：所有数据留在本机，IPC 调用也不经过网络

---

## 7. 依赖清单

| 包名 | 版本 | 用途 |
|---|---|---|
| electron | ^28.0.0 | 桌面框架 |
| @xterm/xterm | ^5.3.0 | 终端仿真 |
| @xterm/addon-fit | ^0.8.0 | 自适应尺寸 |
| @xterm/addon-web-links | ^0.9.0 | URL 识别 |
| node-pty | ^1.0.0 | PTY 驱动 |
| keytar | ^7.9.0 | 系统密钥链（API Key 存储） |
| electron-store | ^8.1.0 | 普通配置持久化 |
| zustand | ^4.5.0 | 状态管理 |
| react | ^18.2.0 | UI 框架 |
| electron-builder | ^24.9.0 | 打包 |
| electron-vite | ^2.0.0 | 构建工具 |
| typescript | ^5.3.0 | 语言 |

---

## 8. 风险与应对

| 风险 | 等级 | 应对 |
|---|---|---|
| AI 响应延迟影响体验 | 高 | 流式输出，卡片骨架屏，可配置自动/手动触发 |
| Ollama 未安装时功能不可用 | 中 | 检测到未安装时引导用户安装，或切换云端模式 |
| API Key 泄露 | 高 | keytar 存入系统密钥链，渲染进程不持有 Key |
| AI 生成命令有误导致危险操作 | 高 | 所有 AI 命令只写入输入框，用户确认后才执行，绝不自动执行 |
| node-pty Windows arm64 兼容性 | 中 | 优先 x64，arm64 后续跟进 |
| 注册表操作失败（无管理员权限） | 低 | 捕获异常，提示用户以管理员身份运行一次以完成注册 |
