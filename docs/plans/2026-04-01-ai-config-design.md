# Auto Shell AI 配置与进度动画设计方案

## 概述

本设计方案涵盖两个功能优化：
1. **AI 模型配置简化** - 用户只需选择模型名称 + 输入 API Key
2. **命令执行进度动画** - 通用进度检测机制，提升终端体验

---

## Part 1: AI 模型配置优化

### 1.1 设计目标

- 用户只需选择模型名称（品牌感知）
- 系统自动适配 baseUrl、默认参数
- 支持高级自定义（自定义端点、temperature、maxTokens）
- API Key 安全存储于系统密钥链

### 1.2 预设模型配置表

```typescript
interface ModelPreset {
  id: string;           // API 模型名
  name: string;         // 用户显示名称
  brand: string;        // 品牌
  baseUrl: string;      // API 端点
  apiPath: string;      // API 路径
  defaultTemperature: number;
  defaultMaxTokens: number;
}

const MODEL_PRESETS: Record<string, ModelPreset> = {
  // Anthropic 系列
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

  // OpenAI 系列
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

  // MiniMax
  'MiniMax-M2.7': {
    name: 'MiniMax M2.7',
    brand: 'MiniMax',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    apiPath: '/v1/messages',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },

  // GLM
  'glm-4': {
    name: 'GLM-4',
    brand: 'Zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiPath: '/chat/completions',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },

  // Ollama (本地)
  'llama3': {
    name: 'Llama 3',
    brand: 'Ollama',
    baseUrl: 'http://localhost:11434',
    apiPath: '/api/chat',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
};
```

### 1.3 配置数据结构

**config.json** (`~/.autoshell/config.json`)
```typescript
interface AppConfig {
  // 当前选中的模型 ID
  currentModel: string;  // 'claude-3-5-sonnet'

  // 模型配置（用户自定义部分）
  modelConfig: {
    baseUrl?: string;        // 自定义端点（可选）
    temperature?: number;   // 可选自定义
    maxTokens?: number;      // 可选自定义
  };

  // 主题
  theme: 'dark' | 'light';

  // 功能开关
  features: {
    errorCard: boolean;
    naturalCommand: boolean;
    explainCommand: boolean;
    commandProgress: boolean;  // 新增：命令进度动画
  };
}
```

**密钥链存储：** API Key 通过系统密钥链独立存储，不在 config.json 中。

### 1.4 配置界面设计

**简单模式（默认）：**
```
┌─────────────────────────────────────────┐
│ AI 模型                                  │
├─────────────────────────────────────────┤
│ 模型: [Claude 3.5 Sonnet           ▼]    │
│                                         │
│ API Key: [••••••••••••••••••••••]        │
│                              [保存]      │
│ 状态: ✓ 已连接                           │
└─────────────────────────────────────────┘
```

**高级选项（点击展开）：**
```
▼ 高级选项
  端点: [https://api.anthropic.com    ]
  Temperature: [0.7      ] [重置]
  Max Tokens: [4096     ] [重置]
```

### 1.5 实现要点

1. **Provider 重构** - 基于模型 ID 查找预设配置
2. **配置迁移** - 兼容现有 config.json 格式
3. **密钥链集成** - 继续使用 keytar 或 electron-store 的 secure 选项
4. **连接测试** - 保存前自动测试连接

---

## Part 2: 命令执行进度动画

### 2.1 设计目标

- 通用进度检测机制，适用于任意长时命令
- 非侵入式显示，不影响终端主输出
- 可配置开关

### 2.2 检测机制

**混合检测策略：**

1. **关键词预判** - 检测到以下命令模式立即显示进度
   - 安装类: `npm`, `yarn`, `pnpm`, `pip`, `cargo`, `gem`
   - 下载类: `curl`, `wget`
   - 构建类: `make`, `cmake`, `gradle`, `mvn`
   - Git 类: `git clone`, `git pull`, `git fetch`
   - Docker 类: `docker build`, `docker pull`

2. **时间动态判断** - 运行超过 3 秒的命令追加进度显示

3. **进度估算** - 根据命令类型和输出尝试估算进度
   - `npm install` - 解析 npm 输出，估算已安装/总包数
   - `curl/wget` - 从 Content-Length 估算
   - 其他命令 - 基于时间的伪进度条

### 2.3 UI 设计

**进度动画显示：**
```
┌─────────────────────────────────────────────────────────────┐
│ ⏳ 执行中...  npm install react-dom                 ⏱ 5s   │
│ ███████████████████████████░░░░░░░░░░░░░░░░░░░░░░░  35%    │
└─────────────────────────────────────────────────────────────┘
```

**样式特点：**
- 位于终端区域顶部，不遮挡主输出
- 半透明背景，不影响阅读
- 显示命令名称 + 运行时间 + 进度条
- 完成或失败时自动消失

### 2.4 可配置项

```typescript
interface ProgressConfig {
  enabled: boolean;           // 总开关
  minDuration: number;        // 最短显示时间（ms），默认 3000
  keywords: string[];         // 自定义关键词
  autoHideDelay: number;      // 完成后自动隐藏延迟（ms）
}
```

### 2.5 实现要点

1. **PTY 输出拦截** - 在 xterm.js 显示前处理 ANSI 输出
2. **命令分类器** - 检测命令类型，决定进度估算策略
3. **React 覆盖层** - 在终端上叠加进度条组件
4. **动画性能** - 避免频繁重渲染，使用 CSS 动画

---

## 优先级建议

| 阶段 | 内容 | 价值 |
|------|------|------|
| P0 | AI 模型配置简化 | 核心功能，用户直接感知 |
| P1 | 命令进度动画基础版 | 体验提升 |
| P2 | 进度估算优化 | 体验提升 |
| P3 | 高级自定义配置 | 完整覆盖 |

---

## 风险与注意事项

1. **进度动画性能** - 频繁的 PTY 输出可能影响性能，需要节流
2. **xterm.js 兼容性** - 需要测试自定义覆盖层与 xterm.js 的兼容性
3. **配置迁移** - 现有用户的配置需要平滑迁移
