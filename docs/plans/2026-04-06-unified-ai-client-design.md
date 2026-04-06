# 统一 AI 客户端设计文档

> **设计版本**: 1.0
> **日期**: 2026-04-06
> **技术栈**: Electron + React + Element Plus + TypeScript

---

## 1. 设计理念

**核心定位**: 现代化 AI 助手客户端，融合 Claude 的简约美学和 Codex 的工作流能力

**设计关键词**: 轻盈、简约、专业、高效

---

## 2. 色彩系统

### 主色板

| 用途 | 色值 | 说明 |
|------|------|------|
| 背景色 | `#faf9f5` | 右侧主背景 |
| 侧边栏背景 | `#f8f7f2` | 左侧侧边栏背景 |
| 卡片背景 | `#ffffff` | 纯白，悬浮元素 |
| 边框色 | `#e8e8e8` | 淡灰边框 |
| 主文字 | `#1a1a1a` | 深黑 |
| 次要文字 | `#6b6b6b` | 中灰 |
| 悬停背景 | `#e8e6dd` | 悬停态 |
| 选中背景 | `#e8e6dd` | 选中态 |

### 语义色

| 用途 | 色值 |
|------|------|
| 成功 | `#22c55e` |
| 警告 | `#f59e0b` |
| 错误 | `#ef4444` |
| 信息 | `#3b82f6` |

### 圆角与阴影

| 元素 | 圆角 | 阴影 |
|------|------|------|
| 侧边栏项 | `8px` | 无 |
| 卡片/面板 | `12px` | `0 2px 8px rgba(0,0,0,0.06)` |
| 输入框 | `20px` | 无 |
| 按钮 | `8px` | 无 |
| 头像 | `50%` | 无 |

---

## 3. 字体系统

### 字体栈

```
font-family: "Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
```

### 字号规范

| 用途 | 字号 | 字重 |
|------|------|------|
| 大标题 | `24px` | 600 |
| 页面标题 | `18px` | 600 |
| 导航项 | `14px` | 500 |
| 正文 | `14px` | 400 |
| 辅助文字 | `12px` | 400 |
| 小标签 | `11px` | 500 |

---

## 4. 侧边栏设计

### 布局结构

```
┌────────────────────────────────────┐
│  Logo / 品牌标识                    │  ← 顶部区域
├────────────────────────────────────┤
│  ✏️ 新建对话                       │  ← 操作按钮
│  🔍 搜索                           │
│  ⚙️ 设置                           │
├────────────────────────────────────┤
│                                    │
│  💬 对话                           │  ← 选中态：背景 #f0f0f0
│  📚 知识库                          │
│  🛠️ 技能                           │
│  📁 项目                           │
│  ✨ 生成物                          │
│                                    │
├────────────────────────────────────┤
│                                    │
│  最近对话                          │  ← 时间分组
│  • Auto-skill 设计       14小时前  │
│  • 登录 Bug 修复         2天前     │
│  • API 文档生成          3天前     │
│                                    │
├────────────────────────────────────┤
│                                    │
│  ┌────┐                           │
│  │ J  │  jelly                   │  ← 用户信息区
│  └────┘                           │
│                                    │
└────────────────────────────────────┘
```

### 侧边栏规格

| 属性 | 值 |
|------|-----|
| 宽度 | `260px` |
| 最小宽度 | `200px` |
| 最大宽度 | `320px` |
| 内边距 | `12px` |
| 项高度 | `40px` |
| 项间距 | `4px` |
| 图标大小 | `18px` |
| 图标颜色 | `#000000` |
| 悬停背景 | `rgba(0, 0, 0, 0.04)` |

### Element Plus 图标映射

| 功能 | 组件 | 图标名 |
|------|------|--------|
| 新建对话 | `el-button` | `Plus` |
| 搜索 | `el-button` | `Search` |
| 设置 | `el-button` | `Setting` |
| 对话 | `el-menu-item` | `ChatDotRound` |
| 知识库 | `el-menu-item` | `Document` |
| 技能 | `el-menu-item` | `Tools` |
| 项目 | `el-menu-item` | `Folder` |
| 生成物 | `el-menu-item` | `Star` |
| 发送 | `el-button` | `Promotion` |
| 附件 | `el-button` | `Paperclip` |
| 模型选择 | `el-select` | `CaretBottom` |
| 语音输入 | `el-button` | `Microphone` |

---

## 5. 主内容区设计

### 布局

```
┌──────────────────────────────────────────────────────────────────┐
│                        主内容区                                   │
│                                                                  │
│    ┌────────────────────────────────────────────────────────┐   │
│    │                                                        │   │
│    │              你好，jelly                               │   │
│    │              有什么可以帮助你的吗？                       │   │
│    │                                                        │   │
│    │    ┌──────────────────────────────────────────────┐   │   │
│    │    │ 💻    📝    ✨    📖    🌿                    │   │   │
│    │    └──────────────────────────────────────────────┘   │   │
│    │                                                        │   │
│    │    ┌──────────────────────────────────────────────┐   │   │
│    │    │                                               │   │   │
│    │    │              对话消息区域                       │   │   │
│    │    │                                               │   │   │
│    │    │                                               │   │   │
│    │    └──────────────────────────────────────────────┘   │   │
│    │                                                        │   │
│    │    ┌──────────────────────────────────────────────┐   │   │
│    │    │ [📎] [Sonnet 4.6 ▼]  [⏺️]  [输入框...]  [▶️] │   │   │
│    │    └──────────────────────────────────────────────┘   │   │
│    │                                                        │   │
│    └────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 输入区域

```
┌────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │  消息输入框...                                           │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  [📎]    [Sonnet 4.6 ▼]           [⏺️]              [▶️]   │
│  附件     模型选择                  语音输入            发送    │
└────────────────────────────────────────────────────────────────┘
```

### 输入框规格

| 属性 | 值 |
|------|-----|
| 最小高度 | `56px` |
| 最大高度 | `200px` |
| 圆角 | `20px` |
| 边框 | `1px solid #e8e8e8` |
| 聚焦边框 | `1px solid #4F46E5` |
| 内边距 | `16px 20px` |
| 字体大小 | `15px` |

---

## 6. 快捷操作 Chips

```
┌─────────────────────────────────────────────────────────┐
│  💻        📝        ✨        📖        🌿             │
│  代码      写作      创建      学习      生活             │
└─────────────────────────────────────────────────────────┘
```

### Chip 按钮规格

| 属性 | 值 |
|------|-----|
| 高度 | `36px` |
| 圆角 | `18px` |
| 背景 | `#ffffff` |
| 边框 | `1px solid #e8e8e8` |
| 悬停背景 | `#f0f0f0` |
| 内边距 | `8px 16px` |
| 图标大小 | `16px` |
| 间距 | `8px` |

---

## 7. 消息气泡

### AI 消息

```
┌─────────────────────────────────────┐
│  ┌────┐                            │
│  │ AI │  AI 助手                    │
│  └────┘                            │
│                                     │
│  你好，这是 AI 的回复内容...         │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 代码块示例                   │    │
│  │ function hello() {         │    │
│  │   return "world";           │    │
│  │ }                           │    │
│  │                        [复制]│    │
│  └─────────────────────────────┘    │
│                                     │
│  14:30                               │
└─────────────────────────────────────┘
```

### 用户消息

```
┌─────────────────────────────────────┐
│                              用户  ┌┴────┐│
│                              jelly │     ││
│                                     │     ││
│  这是用户的输入内容...               │     ││
│                                     │J    ││
│                              14:28 └─────┘│
└─────────────────────────────────────┘
```

---

## 8. 组件清单

### 侧边栏组件 `<Sidebar>`

```tsx
// 状态
interface SidebarState {
  collapsed: boolean;      // 是否折叠
  activeMenu: string;     // 当前激活菜单
  recentThreads: Thread[]; // 最近对话
}

// 属性
interface SidebarProps {
  onNewChat: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onMenuSelect: (menu: string) => void;
}
```

### 对话组件 `<ChatArea>`

```tsx
interface ChatAreaProps {
  threadId: string;
  messages: Message[];
  onSend: (content: string) => void;
  onStop: () => void;
  isLoading: boolean;
}
```

### 输入框组件 `<ChatInput>`

```tsx
interface ChatInputProps {
  model: string;
  onSend: (content: string) => void;
  onStop: () => void;
  onAttach: () => void;
  onVoice: () => void;
  isLoading: boolean;
}
```

### 快捷操作栏 `<QuickActions>`

```tsx
interface QuickAction {
  icon: string;
  label: string;
  action: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}
```

---

## 9. 状态设计

### 全局状态 (Zustand)

```typescript
interface AppState {
  // 侧边栏
  sidebarCollapsed: boolean;
  activeMenu: string;

  // 对话
  currentThread: Thread | null;
  threads: Thread[];

  // 用户
  user: User;

  // 设置
  theme: 'light' | 'dark';
  permissionMode: PermissionMode;
}

interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  model?: string;
  knowledgeIds?: string[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  artifacts?: Artifact[];
  timestamp: Date;
}
```

---

## 10. 路由设计

```
/                     → 首页（新建对话）
/chat/:threadId       → 对话详情
/knowledge            → 知识库管理
/knowledge/:id        → 知识库详情
/skills               → 技能市场
/skills/:skillId      → 技能详情
/projects             → 项目列表
/projects/:id         → 项目详情
/artifacts            → 生成物列表
/settings             → 设置页
/settings/api         → API 设置
/settings/theme       → 主题设置
/settings/permission  → 权限设置
```

---

## 11. 技术实现要点

### Element Plus 配置

```typescript
// 主题定制
import { ElThemeConfig } from 'element-plus';

const theme: ElThemeConfig = {
  '--el-color-primary': '#4F46E5',
  '--el-border-radius-base': '8px',
  '--el-bg-color': '#faf9f5',
  '--el-bg-color-page': '#faf9f5',
};
```

### 图标按需导入

```typescript
import { Plus, Search, Setting, ChatDotRound, Document, Tools, Folder, Star, Promotion, Paperclip, Microphone, CaretBottom } from '@element-plus/icons-vue';
```

### 响应式断点

| 断点 | 宽度 | 侧边栏 |
|------|------|--------|
| Desktop | ≥1024px | 显示 |
| Tablet | 768-1023px | 可折叠 |
| Mobile | <768px | 抽屉模式 |

---

## 12. 目录结构

```
src/
├── main/                      # Electron 主进程
│   ├── index.ts
│   └── ipc-handlers.ts
├── renderer/                  # React 渲染进程
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SidebarMenu.tsx
│   │   │   ├── RecentThreads.tsx
│   │   │   └── UserProfile.tsx
│   │   ├── Chat/
│   │   │   ├── ChatArea.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── QuickActions.tsx
│   │   ├── Knowledge/
│   │   ├── Skills/
│   │   ├── Projects/
│   │   └── Artifacts/
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── ChatPage.tsx
│   │   ├── KnowledgePage.tsx
│   │   ├── SkillsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── stores/
│   │   ├── appStore.ts
│   │   ├── chatStore.ts
│   │   └── userStore.ts
│   ├── hooks/
│   │   ├── useAI.ts
│   │   ├── useThread.ts
│   │   └── useKnowledge.ts
│   ├── services/
│   │   ├── ai/
│   │   ├── tools/
│   │   └── storage/
│   └── styles/
│       ├── variables.css
│       └── global.css
├── preload/
│   └── index.ts
└── shared/
    ├── types/
    └── ipc-channels.ts
```

---

## 13. 优先级

### Phase 1: 基础框架
- [ ] Electron + React 项目搭建
- [ ] Element Plus 集成与主题配置
- [ ] 侧边栏组件
- [ ] 路由配置
- [ ] 基础状态管理

### Phase 2: 核心功能
- [ ] 对话界面
- [ ] 消息展示
- [ ] 输入框组件
- [ ] 快捷操作栏
- [ ] Thread 管理

### Phase 3: 全局模块
- [ ] 知识库模块
- [ ] 技能模块
- [ ] 项目模块
- [ ] 生成物模块

### Phase 4: AI 集成
- [ ] 多模型支持
- [ ] 工具调用
- [ ] 权限系统
- [ ] AI 服务集成

---

## 14. Anti-Patterns (避免)

| 错误做法 | 正确做法 |
|----------|----------|
| 使用 emoji 作为图标 | 使用 Element Plus 图标 |
| 边框使用 `border-white/10` | 边框使用 `#e8e8e8` |
| 文字使用 `#94A3B8` | 文字使用 `#6b6b6b` |
| 悬停使用 scale 动画 | 悬停使用背景色变化 |
| 圆角使用 0px | 圆角使用 8-12px |
| 阴影使用大范围模糊 | 阴影使用小范围硬边 |

---

## 15. 设计验收标准

- [ ] 侧边栏图标清晰可见，无 emoji
- [ ] 背景色 `#faf9f5` 正确应用
- [ ] 所有按钮有 hover 反馈
- [ ] 输入框圆角 `20px` 正确
- [ ] 选中态背景色 `#f0f0f0`
- [ ] 字体大小符合规范
- [ ] 响应式布局正常
