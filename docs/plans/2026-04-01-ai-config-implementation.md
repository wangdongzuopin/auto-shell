# AI 配置与进度动画实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 AI 模型配置简化（预设模型 + API Key）和命令执行进度动画系统

**Architecture:**
- AI 配置：重构 Provider 工厂函数，基于模型 ID 查找预设配置，config.json + 密钥链分离存储
- 进度动画：PTY 输出拦截 + React 覆盖层，关键词预判 + 时间动态检测

**Tech Stack:** Electron, React, xterm.js, zustand, keytar/electron-store

---

## Part 1: AI 模型配置简化

### Task 1: 创建预设模型配置表

**Files:**
- Create: `src/ai/models.ts`
- Modify: `src/ai/index.ts`

**Step 1: 创建模型预设定义**

```typescript
// src/ai/models.ts
export interface ModelPreset {
  id: string;
  name: string;
  brand: string;
  baseUrl: string;
  apiPath: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
}

export const MODEL_PRESETS: Record<string, ModelPreset> = {
  'claude-3-5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    brand: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiPath: '/v1/messages',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'claude-3-haiku': {
    name: 'Claude 3 Haiku',
    brand: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiPath: '/v1/messages',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'gpt-4o': {
    name: 'GPT-4o',
    brand: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    apiPath: '/v1/chat/completions',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    brand: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    apiPath: '/v1/chat/completions',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'MiniMax-M2.7': {
    name: 'MiniMax M2.7',
    brand: 'MiniMax',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    apiPath: '/v1/messages',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'glm-4': {
    name: 'GLM-4',
    brand: 'Zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiPath: '/chat/completions',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'llama3': {
    name: 'Llama 3',
    brand: 'Ollama',
    baseUrl: 'http://localhost:11434',
    apiPath: '/api/chat',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
};

export function getModelPreset(modelId: string): ModelPreset | undefined {
  return MODEL_PRESETS[modelId];
}

export function getAllModelPresets(): ModelPreset[] {
  return Object.values(MODEL_PRESETS);
}
```

**Step 2: 更新 src/ai/index.ts 导出**

```typescript
export { MODEL_PRESETS, getModelPreset, getAllModelPresets } from './models';
export type { ModelPreset } from './models';
```

**Step 3: Commit**
```bash
git add src/ai/models.ts src/ai/index.ts
git commit -m "feat(ai): add model presets configuration"
```

---

### Task 2: 扩展 config.json 结构

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/main/session-store.ts`

**Step 1: 添加配置类型到 types.ts**

```typescript
// src/shared/types.ts 添加

export interface ModelConfig {
  baseUrl?: string;        // 自定义端点（可选）
  temperature?: number;     // 可选自定义
  maxTokens?: number;       // 可选自定义
}

export interface AppConfig {
  provider: ProviderType;
  providerConfig: ProviderSettings;
  providerConfigs: ProviderConfigs;
  aiFeatures: FeatureToggles;
  theme: Theme;
  // 新增
  currentModel: string;     // 'claude-3-5-sonnet'
  modelConfig: ModelConfig; // 用户自定义配置
}
```

**Step 2: 更新默认值（session-store.ts）**

```typescript
// src/main/session-store.ts
const defaultConfig: AppConfig = {
  provider: 'minimax',
  providerConfig: { baseUrl: '', model: '' },
  providerConfigs: defaultProviderConfigs,
  aiFeatures: {
    errorCard: true,
    naturalCommand: true,
    explainCommand: true,
    completion: false,
  },
  theme: { name: 'dark', background: '#0e0f11', foreground: '#ffffff', accent: '#3b82f6' },
  // 新增默认值
  currentModel: 'MiniMax-M2.7',
  modelConfig: {},
};
```

**Step 3: Commit**
```bash
git add src/shared/types.ts src/main/session-store.ts
git commit -m "feat(config): extend AppConfig with model selection"
```

---

### Task 3: 重构 Provider 工厂函数

**Files:**
- Modify: `src/ai/index.ts`

**Step 1: 更新 createProvider 支持模型 ID**

```typescript
// src/ai/index.ts
import { MODEL_PRESETS, getModelPreset } from './models';
import type { ModelPreset } from './models';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export function createProvider(config: ProviderConfig): AIProvider {
  // 如果传入了 modelId，先查找预设
  let finalConfig = config;

  if (config.model && MODEL_PRESETS[config.model]) {
    const preset = MODEL_PRESETS[config.model];
    finalConfig = {
      ...config,
      baseUrl: config.baseUrl || preset.baseUrl,
      model: preset.id,
    };
  }

  switch (config.type) {
    case 'minimax':
      return new ClaudeProvider({
        apiKey: finalConfig.apiKey ?? '',
        baseUrl: finalConfig.baseUrl ?? 'https://api.minimaxi.com/anthropic',
        model: finalConfig.model ?? 'MiniMax-M2.7',
        temperature: finalConfig.temperature,
        maxTokens: finalConfig.maxTokens,
      });
    case 'claude':
      return new ClaudeProvider({
        apiKey: finalConfig.apiKey ?? '',
        baseUrl: finalConfig.baseUrl ?? 'https://api.anthropic.com',
        model: finalConfig.model ?? 'claude-3-5-sonnet',
        temperature: finalConfig.temperature,
        maxTokens: finalConfig.maxTokens,
      });
    case 'openai':
    case 'openaiCompatible':
    case 'glm':
      return new OpenAIProvider({
        apiKey: finalConfig.apiKey ?? '',
        baseUrl: finalConfig.baseUrl ?? '',
        model: finalConfig.model ?? 'gpt-4o',
        temperature: finalConfig.temperature,
        maxTokens: finalConfig.maxTokens,
      });
    case 'ollama':
      return new OllamaProvider({
        baseUrl: finalConfig.baseUrl ?? 'http://localhost:11434',
        model: finalConfig.model ?? 'llama3',
        temperature: finalConfig.temperature,
        maxTokens: finalConfig.maxTokens,
      });
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}
```

**Step 2: Commit**
```bash
git add src/ai/index.ts
git commit -m "feat(provider): support model preset lookup in factory"
```

---

### Task 4: 创建设置面板 AI 配置组件

**Files:**
- Modify: `src/renderer/components/Settings/AIModelSelector.tsx` (Create)
- Modify: `src/renderer/components/Settings/index.tsx`

**Step 1: 创建 AI 模型选择组件**

```tsx
// src/renderer/components/Settings/AIModelSelector.tsx
import { useState } from 'react';
import { getAllModelPresets, MODEL_PRESETS } from '../../../ai/models';

interface AIModelSelectorProps {
  currentModel: string;
  apiKey: string;
  modelConfig: {
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
  };
  onModelChange: (modelId: string) => void;
  onApiKeyChange: (apiKey: string) => void;
  onConfigChange: (config: AIModelSelectorProps['modelConfig']) => void;
}

export function AIModelSelector({
  currentModel,
  apiKey,
  modelConfig,
  onModelChange,
  onApiKeyChange,
  onConfigChange,
}: AIModelSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const models = getAllModelPresets();

  const currentPreset = MODEL_PRESETS[currentModel];

  const handleTestConnection = async () => {
    setIsConnected(null);
    try {
      const available = await window.api.checkAIAvailable();
      setIsConnected(available);
    } catch {
      setIsConnected(false);
    }
  };

  const handleReset = (field: 'baseUrl' | 'temperature' | 'maxTokens') => {
    if (currentPreset) {
      if (field === 'baseUrl') {
        onConfigChange({ ...modelConfig, baseUrl: undefined });
      } else if (field === 'temperature') {
        onConfigChange({ ...modelConfig, temperature: currentPreset.defaultTemperature });
      } else if (field === 'maxTokens') {
        onConfigChange({ ...modelConfig, maxTokens: currentPreset.defaultMaxTokens });
      }
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ marginBottom: '16px' }}>AI 模型</h3>

      {/* 模型选择 */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', color: '#9ca3af' }}>
          模型
        </label>
        <select
          value={currentModel}
          onChange={(e) => onModelChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '6px',
            color: '#fff',
          }}
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.brand})
            </option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', color: '#9ca3af' }}>
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="sk-..."
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '6px',
            color: '#fff',
          }}
        />
      </div>

      {/* 连接状态 */}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={handleTestConnection}
          style={{
            padding: '6px 12px',
            background: '#3b82f6',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          测试连接
        </button>
        {isConnected === true && (
          <span style={{ color: '#22c55e' }}>✓ 已连接</span>
        )}
        {isConnected === false && (
          <span style={{ color: '#ef4444' }}>✗ 连接失败</span>
        )}
      </div>

      {/* 高级选项 */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          {showAdvanced ? '▲' : '▼'} 高级选项
        </button>

        {showAdvanced && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#1f2937', borderRadius: '6px' }}>
            {/* 自定义端点 */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#9ca3af' }}>
                端点
              </label>
              <input
                type="text"
                value={modelConfig.baseUrl || currentPreset?.baseUrl || ''}
                onChange={(e) => onConfigChange({ ...modelConfig, baseUrl: e.target.value })}
                placeholder={currentPreset?.baseUrl}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              />
            </div>

            {/* Temperature */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#9ca3af' }}>
                Temperature
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={modelConfig.temperature ?? currentPreset?.defaultTemperature ?? 0.7}
                  onChange={(e) => onConfigChange({ ...modelConfig, temperature: parseFloat(e.target.value) })}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '4px',
                    color: '#fff',
                  }}
                />
                <button
                  onClick={() => handleReset('temperature')}
                  style={{
                    padding: '6px 12px',
                    background: '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#9ca3af',
                    cursor: 'pointer',
                  }}
                >
                  重置
                </button>
              </div>
            </div>

            {/* Max Tokens */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', color: '#9ca3af' }}>
                Max Tokens
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={modelConfig.maxTokens ?? currentPreset?.defaultMaxTokens ?? 4096}
                  onChange={(e) => onConfigChange({ ...modelConfig, maxTokens: parseInt(e.target.value) })}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '4px',
                    color: '#fff',
                  }}
                />
                <button
                  onClick={() => handleReset('maxTokens')}
                  style={{
                    padding: '6px 12px',
                    background: '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#9ca3af',
                    cursor: 'pointer',
                  }}
                >
                  重置
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add src/renderer/components/Settings/AIModelSelector.tsx
git commit -m "feat(settings): add AI model selector component"
```

---

## Part 2: 命令执行进度动画

### Task 5: 创建命令分类器

**Files:**
- Create: `src/tools/commandClassifier.ts`

**Step 1: 创建命令分类器**

```typescript
// src/tools/commandClassifier.ts

export interface CommandPattern {
  pattern: RegExp;
  type: 'install' | 'download' | 'build' | 'git' | 'docker' | 'general';
  estimator: 'npm' | 'cargo' | 'curl' | 'time' | 'none';
}

export const COMMAND_PATTERNS: CommandPattern[] = [
  // 安装类
  { pattern: /^npm\s+(install|ci|add)/, type: 'install', estimator: 'npm' },
  { pattern: /^yarn\s+(add|install)/, type: 'install', estimator: 'npm' },
  { pattern: /^pnpm\s+(add|install)/, type: 'install', estimator: 'npm' },
  { pattern: /^pip\s+(install|download)/, type: 'install', estimator: 'cargo' },
  { pattern: /^cargo\s+(build|install|fetch)/, type: 'install', estimator: 'cargo' },
  { pattern: /^gem\s+install/, type: 'install', estimator: 'cargo' },

  // 下载类
  { pattern: /^curl\s+-/, type: 'download', estimator: 'curl' },
  { pattern: /^wget\s+-/, type: 'download', estimator: 'curl' },

  // 构建类
  { pattern: /^make(\s|$)/, type: 'build', estimator: 'time' },
  { pattern: /^cmake\s+/, type: 'build', estimator: 'time' },
  { pattern: /^gradle\s+/, type: 'build', estimator: 'time' },
  { pattern: /^mvn\s+/, type: 'build', estimator: 'time' },

  // Git 类
  { pattern: /^git\s+clone/, type: 'git', estimator: 'curl' },
  { pattern: /^git\s+(pull|fetch|checkout)/, type: 'git', estimator: 'time' },

  // Docker 类
  { pattern: /^docker\s+(build|pull|run)/, type: 'docker', estimator: 'curl' },
];

export interface ClassifiedCommand {
  raw: string;
  type: CommandPattern['type'];
  estimator: CommandPattern['estimator'];
  isLongRunning: boolean;
}

export function classifyCommand(command: string): ClassifiedCommand | null {
  const trimmed = command.trim();

  for (const cp of COMMAND_PATTERNS) {
    if (cp.pattern.test(trimmed)) {
      return {
        raw: trimmed,
        type: cp.type,
        estimator: cp.estimator,
        isLongRunning: true,
      };
    }
  }

  return null;
}
```

**Step 2: Commit**
```bash
git add src/tools/commandClassifier.ts
git commit -m "feat(tools): add command classifier for progress detection"
```

---

### Task 6: 创建进度检测 Hook

**Files:**
- Create: `src/renderer/hooks/useCommandProgress.ts`

**Step 1: 创建进度检测 Hook**

```typescript
// src/renderer/hooks/useCommandProgress.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { classifyCommand, ClassifiedCommand } from '../tools/commandClassifier';

export interface ProgressInfo {
  command: string;
  type: ClassifiedCommand['type'];
  startTime: number;
  elapsed: number;        // 秒
  progress: number;       // 0-100
  output: string[];        // 最新输出行
  isComplete: boolean;
}

interface UseCommandProgressOptions {
  minDuration: number;     // 最小显示时间(ms)
  autoHideDelay: number;   // 完成后自动隐藏延迟(ms)
}

const DEFAULT_OPTIONS: UseCommandProgressOptions = {
  minDuration: 3000,
  autoHideDelay: 2000,
};

export function useCommandProgress(options: Partial<UseCommandProgressOptions> = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const outputBufferRef = useRef<string[]>([]);

  // 启动进度跟踪
  const startTracking = useCallback((command: string) => {
    const classified = classifyCommand(command);

    if (!classified) {
      // 非长时命令，不显示进度
      return;
    }

    const startTime = Date.now();
    outputBufferRef.current = [];

    setProgress({
      command: classified.raw,
      type: classified.type,
      startTime,
      elapsed: 0,
      progress: 0,
      output: [],
      isComplete: false,
    });
    setIsVisible(true);

    // 启动定时器更新 elapsed
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setProgress((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          elapsed,
          // 基于时间的伪进度（无法准确估算时）
          progress: Math.min(95, elapsed * 10),
        };
      });
    }, 1000);
  }, []);

  // 添加输出行
  const addOutput = useCallback((line: string) => {
    outputBufferRef.current.push(line);
    if (outputBufferRef.current.length > 5) {
      outputBufferRef.current.shift();
    }
    setProgress((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        output: [...outputBufferRef.current],
      };
    });
  }, []);

  // 完成命令
  const complete = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setProgress((prev) => {
      if (!prev) return null;
      return { ...prev, progress: 100, isComplete: true };
    });

    // 自动隐藏
    setTimeout(() => {
      setIsVisible(false);
      setProgress(null);
    }, opts.autoHideDelay);
  }, [opts.autoHideDelay]);

  // 取消跟踪
  const cancel = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsVisible(false);
    setProgress(null);
    outputBufferRef.current = [];
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    progress,
    isVisible,
    startTracking,
    addOutput,
    complete,
    cancel,
  };
}
```

**Step 2: Commit**
```bash
git add src/renderer/hooks/useCommandProgress.ts
git commit -m "feat(hooks): add useCommandProgress hook"
```

---

### Task 7: 创建进度条组件

**Files:**
- Create: `src/renderer/components/CommandProgressBar.tsx`

**Step 1: 创建进度条组件**

```tsx
// src/renderer/components/CommandProgressBar.tsx
import { ProgressInfo } from '../hooks/useCommandProgress';

interface CommandProgressBarProps {
  progress: ProgressInfo;
  onCancel?: () => void;
}

export function CommandProgressBar({ progress, onCancel }: CommandProgressBarProps) {
  const { command, type, elapsed, progress: percent, output, isComplete } = progress;

  const typeIcons: Record<string, string> = {
    install: '📦',
    download: '⬇️',
    build: '🔨',
    git: '📂',
    docker: '🐳',
    general: '⏳',
  };

  const typeLabels: Record<string, string> = {
    install: '安装中',
    download: '下载中',
    build: '构建中',
    git: 'Git 操作中',
    docker: 'Docker 操作中',
    general: '执行中',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid #334155',
        padding: '8px 12px',
        zIndex: 100,
        fontFamily: 'monospace',
        fontSize: '13px',
      }}
    >
      {/* 标题行 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ marginRight: '8px' }}>{typeIcons[type]}</span>
        <span style={{ color: '#f1f5f9' }}>
          {typeLabels[type]} {command.slice(0, 40)}
          {command.length > 40 ? '...' : ''}
        </span>
        <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>
          ⏱ {elapsed}s
        </span>
        {!isComplete && (
          <button
            onClick={onCancel}
            style={{
              marginLeft: '8px',
              padding: '2px 6px',
              background: '#374151',
              border: 'none',
              borderRadius: '4px',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            取消
          </button>
        )}
        {isComplete && (
          <span style={{ marginLeft: '8px', color: '#22c55e' }}>✓</span>
        )}
      </div>

      {/* 进度条 */}
      <div
        style={{
          height: '4px',
          background: '#334155',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            background: isComplete
              ? '#22c55e'
              : percent < 30
                ? '#3b82f6'
                : percent < 70
                  ? '#f59e0b'
                  : '#22c55e',
            borderRadius: '2px',
            transition: 'width 0.3s ease, background 0.3s ease',
          }}
        />
      </div>

      {/* 最新输出预览 */}
      {output.length > 0 && (
        <div
          style={{
            marginTop: '4px',
            color: '#64748b',
            fontSize: '11px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {output[output.length - 1]}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add src/renderer/components/CommandProgressBar.tsx
git commit -m "feat(ui): add CommandProgressBar component"
```

---

## 实施顺序

1. ✅ Task 1: 创建预设模型配置表
2. ✅ Task 2: 扩展 config.json 结构
3. ✅ Task 3: 重构 Provider 工厂函数
4. ✅ Task 4: 创建设置面板 AI 配置组件
5. ✅ Task 5: 创建命令分类器
6. ✅ Task 6: 创建进度检测 Hook
7. ✅ Task 7: 创建进度条组件

---

## 验证方式

1. **编译验证**: `bun run build` 无错误
2. **类型检查**: `tsc --noEmit` 无错误
3. **功能验证**:
   - 选择不同模型，验证配置自动填充
   - 输入无效 API Key，验证错误提示
   - 执行 `npm install` 命令，验证进度条显示
   - 执行 `ls` 命令，验证不显示进度条（短命令）
