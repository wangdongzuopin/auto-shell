# 统一 AI 客户端重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 auto-shell 从终端工具重构为统一 AI 客户端，采用 Claude 风格界面，支持对话、知识库、技能、项目和生成物管理。

**Architecture:** 基于现有 Electron + React 技术栈，新增 react-router-dom 路由、Element Plus UI 组件库、Zustand 状态管理。重构成左侧侧边栏 + 右侧主内容区的双栏布局，保留 AI 多模型集成能力。

**Tech Stack:** Electron, React 18, TypeScript, Element Plus, Zustand, react-router-dom

---

## 目录结构目标

```
src/
├── main/                      # Electron 主进程
│   └── index.ts
├── renderer/                  # React 渲染进程
│   ├── App.tsx               # 根组件（路由）
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
│   │   └── common/
│   │       └── Header.tsx
│   ├── pages/
│   │   ├── Home.tsx          # 首页/新建对话
│   │   ├── ChatPage.tsx      # 对话详情
│   │   ├── KnowledgePage.tsx # 知识库
│   │   ├── SkillsPage.tsx    # 技能市场
│   │   ├── ProjectsPage.tsx  # 项目
│   │   └── SettingsPage.tsx  # 设置
│   ├── stores/
│   │   ├── appStore.ts       # 应用状态
│   │   ├── chatStore.ts      # 对话状态
│   │   └── userStore.ts     # 用户状态
│   ├── hooks/
│   │   └── useAI.ts
│   └── styles/
│       ├── variables.css
│       └── global.css
└── shared/
    └── types/
        └── index.ts
```

---

## Task 1: 项目依赖安装与配置

**Files:**
- Modify: `package.json`
- Create: `src/renderer/styles/variables.css`
- Create: `src/renderer/styles/global.css`

**Step 1: 检查当前 package.json**

```json
{
  "name": "auto-shell",
  "version": "0.2.0",
  "dependencies": {
    "@xterm/addon-fit": "^0.11.0",
    "@xterm/addon-web-links": "^0.12.0",
    "@xterm/xterm": "^6.0.0",
    "node-pty": "^1.0.0",
    "zustand": "^4.5.0"
  }
}
```

**Step 2: 安装新依赖**

Run: `cd D:/Agent/auto-shell && npm install element-plus @element-plus/icons-vue react-router-dom`
Expected: 安装成功

**Step 3: 创建变量 CSS 文件**

Create `src/renderer/styles/variables.css`:

```css
:root {
  /* 背景色 */
  --bg-primary: #faf9f5;
  --bg-sidebar: #f8f7f2;
  --bg-card: #ffffff;

  /* 边框 */
  --border-color: #e8e8e8;

  /* 文字 */
  --text-primary: #1a1a1a;
  --text-secondary: #6b6b6b;

  /* 悬停/选中 */
  --hover-bg: #e8e6dd;
  --selected-bg: #e8e6dd;

  /* 语义色 */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* 圆角 */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;

  /* 阴影 */
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.06);

  /* 侧边栏 */
  --sidebar-width: 260px;
  --sidebar-item-height: 40px;
  --sidebar-padding: 12px;

  /* 字体 */
  --font-family: "Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
}
```

**Step 4: 创建全局样式**

Create `src/renderer/styles/global.css`:

```css
@import './variables.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button {
  border: none;
  background: none;
  cursor: pointer;
  font-family: inherit;
}

input, textarea {
  font-family: inherit;
  border: none;
  outline: none;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
```

**Step 5: Commit**

```bash
cd D:/Agent/auto-shell
git add package.json src/renderer/styles/
git commit -m "chore: install Element Plus, react-router-dom and add CSS variables"
```

---

## Task 2: 创建共享类型定义

**Files:**
- Create: `src/shared/types/index.ts`

**Step 1: 创建类型文件**

Create `src/shared/types/index.ts`:

```typescript
// Thread / 对话
export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
  knowledgeIds?: string[];
}

// Message / 消息
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  artifacts?: Artifact[];
  timestamp: number;
}

// Artifact / 生成物
export interface Artifact {
  id: string;
  type: 'code' | 'document' | 'image';
  title: string;
  content: string;
  language?: string;
  createdAt: number;
}

// Knowledge / 知识库
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

// Skill / 技能
export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  enabled: boolean;
}

// Project / 项目
export interface Project {
  id: string;
  name: string;
  description?: string;
  threadIds: string[];
  knowledgeIds: string[];
  createdAt: number;
  updatedAt: number;
}

// User / 用户
export interface User {
  id: string;
  name: string;
  avatar?: string;
}

// Permission Mode
export type PermissionMode =
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'default'
  | 'dontAsk'
  | 'plan';
```

**Step 2: Commit**

```bash
cd D:/Agent/auto-shell
git add src/shared/types/
git commit -m "feat(types): add shared type definitions"
```

---

## Task 3: 创建 Zustand Stores

**Files:**
- Create: `src/renderer/stores/appStore.ts`
- Create: `src/renderer/stores/chatStore.ts`
- Create: `src/renderer/stores/userStore.ts`

**Step 1: 创建 appStore**

Create `src/renderer/stores/appStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PermissionMode } from '../../shared/types';

interface AppState {
  // 侧边栏
  sidebarCollapsed: boolean;
  activeMenu: string;

  // 权限
  permissionMode: PermissionMode;
  permissionEnabled: boolean; // 权限开关

  // Actions
  toggleSidebar: () => void;
  setActiveMenu: (menu: string) => void;
  setPermissionMode: (mode: PermissionMode) => void;
  togglePermission: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeMenu: 'chat',
      permissionMode: 'default',
      permissionEnabled: true,

      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed
      })),

      setActiveMenu: (menu) => set({ activeMenu: menu }),

      setPermissionMode: (mode) => set({ permissionMode: mode }),

      togglePermission: () => set((state) => ({
        permissionEnabled: !state.permissionEnabled
      })),
    }),
    {
      name: 'app-storage',
    }
  )
);
```

**Step 2: 创建 chatStore**

Create `src/renderer/stores/chatStore.ts`:

```typescript
import { create } from 'zustand';
import type { Thread, Message, Artifact } from '../../shared/types';

interface ChatState {
  // 对话列表
  threads: Thread[];
  currentThreadId: string | null;

  // 当前对话
  currentThread: Thread | null;
  isLoading: boolean;

  // Actions - Thread
  createThread: (title?: string) => Thread;
  deleteThread: (id: string) => void;
  updateThread: (id: string, updates: Partial<Thread>) => void;
  setCurrentThread: (id: string | null) => void;
  getThread: (id: string) => Thread | undefined;

  // Actions - Message
  addMessage: (threadId: string, message: Message) => void;
  updateMessage: (threadId: string, messageId: string, updates: Partial<Message>) => void;
  clearMessages: (threadId: string) => void;

  // Actions - Artifact
  addArtifact: (threadId: string, artifact: Artifact) => void;

  // Loading
  setLoading: (loading: boolean) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useChatStore = create<ChatState>()((set, get) => ({
  threads: [],
  currentThreadId: null,
  currentThread: null,
  isLoading: false,

  createThread: (title) => {
    const now = Date.now();
    const thread: Thread = {
      id: generateId(),
      title: title || '新对话',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ threads: [thread, ...state.threads] }));
    return thread;
  },

  deleteThread: (id) => set((state) => ({
    threads: state.threads.filter((t) => t.id !== id),
    currentThreadId: state.currentThreadId === id ? null : state.currentThreadId,
    currentThread: state.currentThreadId === id ? null : state.currentThread,
  })),

  updateThread: (id, updates) => set((state) => ({
    threads: state.threads.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
    ),
    currentThread: state.currentThreadId === id
      ? { ...state.currentThread!, ...updates, updatedAt: Date.now() }
      : state.currentThread,
  })),

  setCurrentThread: (id) => set((state) => ({
    currentThreadId: id,
    currentThread: id ? state.threads.find((t) => t.id === id) || null : null,
  })),

  getThread: (id) => get().threads.find((t) => t.id === id),

  addMessage: (threadId, message) => set((state) => ({
    threads: state.threads.map((t) =>
      t.id === threadId
        ? { ...t, messages: [...t.messages, message], updatedAt: Date.now() }
        : t
    ),
    currentThread: state.currentThreadId === threadId
      ? { ...state.currentThread!, messages: [...state.currentThread.messages, message] }
      : state.currentThread,
  })),

  updateMessage: (threadId, messageId, updates) => set((state) => ({
    threads: state.threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            messages: t.messages.map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            ),
          }
        : t
    ),
    currentThread: state.currentThreadId === threadId
      ? {
          ...state.currentThread!,
          messages: state.currentThread.messages.map((m) =>
            m.id === messageId ? { ...m, ...updates } : m
          ),
        }
      : state.currentThread,
  })),

  clearMessages: (threadId) => set((state) => ({
    threads: state.threads.map((t) =>
      t.id === threadId ? { ...t, messages: [] } : t
    ),
    currentThread: state.currentThreadId === threadId
      ? { ...state.currentThread!, messages: [] }
      : state.currentThread,
  })),

  addArtifact: (threadId, artifact) => set((state) => ({
    threads: state.threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            messages: t.messages.map((m) =>
              m.role === 'assistant'
                ? { ...m, artifacts: [...(m.artifacts || []), artifact] }
                : m
            ),
          }
        : t
    ),
  })),

  setLoading: (loading) => set({ isLoading: loading }),
}));
```

**Step 3: 创建 userStore**

Create `src/renderer/stores/userStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../../shared/types';

interface UserState {
  user: User;
  updateUser: (updates: Partial<User>) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: {
        id: 'default-user',
        name: 'jelly',
      },
      updateUser: (updates) => set((state) => ({
        user: { ...state.user, ...updates },
      })),
    }),
    {
      name: 'user-storage',
    }
  )
);
```

**Step 4: Commit**

```bash
cd D:/Agent/auto-shell
git add src/renderer/stores/
git commit -m "feat(stores): add Zustand stores for app, chat and user state"
```

---

## Task 4: 创建侧边栏组件

**Files:**
- Create: `src/renderer/components/Sidebar/Sidebar.tsx`
- Create: `src/renderer/components/Sidebar/SidebarMenu.tsx`
- Create: `src/renderer/components/Sidebar/RecentThreads.tsx`
- Create: `src/renderer/components/Sidebar/UserProfile.tsx`

**Step 1: 创建 Sidebar.tsx**

Create `src/renderer/components/Sidebar/Sidebar.tsx`:

```tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, Setting } from '@element-plus/icons-vue';
import { ElButton, ElTooltip } from 'element-plus';
import { SidebarMenu } from './SidebarMenu';
import { RecentThreads } from './RecentThreads';
import { UserProfile } from './UserProfile';
import { useChatStore } from '../../stores/chatStore';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const createThread = useChatStore((state) => state.createThread);

  const handleNewChat = () => {
    const thread = createThread();
    navigate(`/chat/${thread.id}`);
  };

  const handleSearch = () => {
    // TODO: 实现搜索功能
    console.log('Search clicked');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <aside className="sidebar">
      {/* Logo 区域 */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-text">AI Client</span>
        </div>
      </div>

      {/* 顶部操作按钮 */}
      <div className="sidebar-actions">
        <ElTooltip content="新建对话" placement="right">
          <button className="sidebar-action-btn" onClick={handleNewChat}>
            <Plus />
            <span>新建对话</span>
          </button>
        </ElTooltip>

        <ElTooltip content="搜索" placement="right">
          <button className="sidebar-action-btn" onClick={handleSearch}>
            <Search />
            <span>搜索</span>
          </button>
        </ElTooltip>

        <ElTooltip content="设置" placement="right">
          <button
            className={`sidebar-action-btn ${isActive('/settings') ? 'active' : ''}`}
            onClick={handleSettings}
          >
            <Setting />
            <span>设置</span>
          </button>
        </ElTooltip>
      </div>

      {/* 菜单 */}
      <SidebarMenu />

      {/* 最近对话 */}
      <RecentThreads />

      {/* 用户信息 */}
      <UserProfile />
    </aside>
  );
};
```

**Step 2: 创建 Sidebar.css**

Create `src/renderer/components/Sidebar/Sidebar.css`:

```css
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: var(--sidebar-padding);
  border-bottom: 1px solid var(--border-color);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.sidebar-actions {
  padding: var(--sidebar-padding);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: var(--sidebar-item-height);
  padding: 0 12px;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.15s ease;
}

.sidebar-action-btn:hover {
  background-color: var(--hover-bg);
}

.sidebar-action-btn.active {
  background-color: var(--selected-bg);
}

.sidebar-action-btn .el-icon {
  font-size: 18px;
}
```

**Step 3: 创建 SidebarMenu.tsx**

Create `src/renderer/components/Sidebar/SidebarMenu.tsx`:

```tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChatDotRound,
  Document,
  Tools,
  Folder,
  Star
} from '@element-plus/icons-vue';
import './SidebarMenu.css';

interface MenuItem {
  key: string;
  label: string;
  icon: any;
  path: string;
}

const menuItems: MenuItem[] = [
  { key: 'chat', label: '对话', icon: ChatDotRound, path: '/' },
  { key: 'knowledge', label: '知识库', icon: Document, path: '/knowledge' },
  { key: 'skills', label: '技能', icon: Tools, path: '/skills' },
  { key: 'projects', label: '项目', icon: Folder, path: '/projects' },
  { key: 'artifacts', label: '生成物', icon: Star, path: '/artifacts' },
];

export const SidebarMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/chat/');
    }
    return location.pathname.startsWith(path);
  };

  const handleClick = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="sidebar-menu">
      {menuItems.map((item) => (
        <button
          key={item.key}
          className={`sidebar-menu-item ${isActive(item.path) ? 'active' : ''}`}
          onClick={() => handleClick(item.path)}
        >
          <component is={item.icon} className="menu-icon" />
          <span className="menu-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
```

**Step 4: 创建 SidebarMenu.css**

Create `src/renderer/components/Sidebar/SidebarMenu.css`:

```css
.sidebar-menu {
  padding: 8px var(--sidebar-padding);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: var(--sidebar-item-height);
  padding: 0 12px;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.15s ease;
}

.sidebar-menu-item:hover {
  background-color: var(--hover-bg);
}

.sidebar-menu-item.active {
  background-color: var(--selected-bg);
}

.menu-icon {
  font-size: 18px;
  color: #000000;
}

.menu-label {
  flex: 1;
  text-align: left;
}
```

**Step 5: 创建 RecentThreads.tsx**

Create `src/renderer/components/Sidebar/RecentThreads.tsx`:

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../stores/chatStore';
import './RecentThreads.css';

const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
};

export const RecentThreads: React.FC = () => {
  const navigate = useNavigate();
  const threads = useChatStore((state) => state.threads);
  const setCurrentThread = useChatStore((state) => state.setCurrentThread);

  const handleThreadClick = (threadId: string) => {
    setCurrentThread(threadId);
    navigate(`/chat/${threadId}`);
  };

  const recentThreads = threads.slice(0, 5);

  return (
    <div className="recent-threads">
      <div className="recent-header">最近对话</div>
      <div className="recent-list">
        {recentThreads.map((thread) => (
          <button
            key={thread.id}
            className="recent-item"
            onClick={() => handleThreadClick(thread.id)}
          >
            <span className="recent-title">{thread.title}</span>
            <span className="recent-time">{formatTime(thread.updatedAt)}</span>
          </button>
        ))}
        {recentThreads.length === 0 && (
          <div className="recent-empty">暂无对话记录</div>
        )}
      </div>
    </div>
  );
};
```

**Step 6: 创建 RecentThreads.css**

Create `src/renderer/components/Sidebar/RecentThreads.css`:

```css
.recent-threads {
  flex: 1;
  overflow-y: auto;
  padding: 8px var(--sidebar-padding);
}

.recent-header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
  transition: background-color 0.15s ease;
}

.recent-item:hover {
  background-color: var(--hover-bg);
}

.recent-title {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-time {
  font-size: 11px;
  color: var(--text-secondary);
  margin-left: 8px;
  flex-shrink: 0;
}

.recent-empty {
  padding: 12px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}
```

**Step 7: 创建 UserProfile.tsx**

Create `src/renderer/components/Sidebar/UserProfile.tsx`:

```tsx
import React from 'react';
import { useUserStore } from '../../stores/userStore';
import './UserProfile.css';

export const UserProfile: React.FC = () => {
  const user = useUserStore((state) => state.user);

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="user-profile">
      <div className="user-avatar">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} />
        ) : (
          <span className="avatar-initial">{getInitial(user.name)}</span>
        )}
      </div>
      <div className="user-info">
        <span className="user-name">{user.name}</span>
      </div>
    </div>
  );
};
```

**Step 8: 创建 UserProfile.css**

Create `src/renderer/components/Sidebar/UserProfile.css`:

```css
.user-profile {
  padding: var(--sidebar-padding);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initial {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

**Step 9: Commit**

```bash
cd D:/Agent/auto-shell
git add src/renderer/components/Sidebar/
git commit -m "feat(sidebar): create sidebar components with menu and recent threads"
```

---

## Task 5: 创建 Header 组件

**Files:**
- Create: `src/renderer/components/common/Header.tsx`
- Create: `src/renderer/components/common/Header.css`

**Step 1: 创建 Header.tsx**

Create `src/renderer/components/common/Header.tsx`:

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Operation } from '@element-plus/icons-vue';
import './Header.css';

interface HeaderProps {
  title?: string;
  showNav?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showNav = true }) => {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      {showNav && (
        <div className="header-nav">
          <button className="nav-btn" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </button>
          <button className="nav-btn" onClick={() => navigate(1)}>
            <ArrowRight />
          </button>
        </div>
      )}

      {title && <h1 className="header-title">{title}</h1>}

      <div className="header-actions">
        <button className="action-btn">
          <Operation />
        </button>
      </div>
    </header>
  );
};
```

**Step 2: 创建 Header.css**

Create `src/renderer/components/common/Header.css`:

```css
.app-header {
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-primary);
}

.header-nav {
  display: flex;
  gap: 4px;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.15s ease;
}

.nav-btn:hover {
  background-color: var(--hover-bg);
  color: var(--text-primary);
}

.header-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.15s ease;
}

.action-btn:hover {
  background-color: var(--hover-bg);
  color: var(--text-primary);
}
```

**Step 3: Commit**

```bash
cd D:/Agent/auto-shell
git add src/renderer/components/common/
git commit -m "feat(header): create common header component"
```

---

## Task 6: 创建对话页面组件

**Files:**
- Create: `src/renderer/components/Chat/ChatArea.tsx`
- Create: `src/renderer/components/Chat/ChatMessage.tsx`
- Create: `src/renderer/components/Chat/ChatInput.tsx`
- Create: `src/renderer/components/Chat/QuickActions.tsx`
- Create: `src/renderer/components/Chat/Chat.css`

**Step 1: 创建 ChatArea.tsx**

Create `src/renderer/components/Chat/ChatArea.tsx`:

```tsx
import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '../../stores/chatStore';
import { useAIStore } from '../../store/ai'; // 复用现有的
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import './Chat.css';

export const ChatArea: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const currentThread = useChatStore((state) => state.currentThread);
  const setCurrentThread = useChatStore((state) => state.setCurrentThread);
  const threads = useChatStore((state) => state.threads);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadId) {
      setCurrentThread(threadId);
    }
  }, [threadId, setCurrentThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentThread?.messages]);

  const handleSend = async (content: string) => {
    // TODO: 调用 AI
    console.log('Send message:', content);
  };

  if (!currentThread) {
    return (
      <div className="chat-area chat-empty">
        <div className="empty-state">
          <h2>你好，jelly</h2>
          <p>有什么可以帮助你的吗？</p>
          <QuickActions />
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <div className="chat-messages">
        {currentThread.messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} />
    </div>
  );
};
```

**Step 2: 创建 ChatMessage.tsx**

Create `src/renderer/components/Chat/ChatMessage.tsx`:

```tsx
import React from 'react';
import type { Message } from '../../../shared/types';
import './ChatMessage.css';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-avatar">
        {isUser ? (
          <span className="avatar user-avatar">J</span>
        ) : (
          <span className="avatar ai-avatar">AI</span>
        )}
      </div>
      <div className="message-content">
        <div className="message-bubble">
          {message.content}
          {message.artifacts?.map((artifact) => (
            <div key={artifact.id} className="artifact-card">
              <div className="artifact-header">
                <span className="artifact-title">{artifact.title}</span>
                <span className="artifact-type">{artifact.type}</span>
              </div>
              <pre className="artifact-content">
                <code>{artifact.content}</code>
              </pre>
              <button className="artifact-copy">复制</button>
            </div>
          ))}
        </div>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
};
```

**Step 3: 创建 ChatMessage.css**

Create `src/renderer/components/Chat/ChatMessage.css`:

```css
.chat-message {
  display: flex;
  gap: 16px;
  padding: 16px 24px;
  max-width: 100%;
}

.chat-message.user {
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
  font-size: 14px;
  font-weight: 600;
}

.user-avatar {
  background-color: var(--bg-card);
  color: var(--text-primary);
}

.ai-avatar {
  background-color: var(--text-primary);
  color: var(--bg-card);
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-message.user .message-content {
  align-items: flex-end;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background-color: var(--bg-card);
  box-shadow: var(--shadow-card);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-message.user .message-bubble {
  background-color: var(--text-primary);
  color: var(--bg-card);
}

.message-time {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 0 4px;
}

.artifact-card {
  margin-top: 12px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.artifact-header {
  padding: 8px 12px;
  background-color: var(--bg-sidebar);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.artifact-title {
  font-size: 13px;
  font-weight: 500;
}

.artifact-type {
  font-size: 11px;
  color: var(--text-secondary);
}

.artifact-content {
  padding: 12px;
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  overflow-x: auto;
}

.artifact-copy {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--color-info);
  background: none;
  border-top: 1px solid var(--border-color);
  width: 100%;
  text-align: right;
}

.artifact-copy:hover {
  background-color: var(--hover-bg);
}
```

**Step 4: 创建 ChatInput.tsx**

Create `src/renderer/components/Chat/ChatInput.tsx`:

```tsx
import React, { useState, useRef } from 'react';
import { Paperclip, Promotion, VideoCamera, Loading } from '@element-plus/icons-vue';
import { ElSelect, ElOption } from 'element-plus';
import './ChatInput.css';

interface ChatInputProps {
  onSend: (content: string) => void;
  isLoading?: boolean;
  onStop?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isLoading = false,
  onStop,
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttach = () => {
    // TODO: 实现文件上传
    console.log('Attach file');
  };

  const handleVoice = () => {
    // TODO: 实现语音输入
    console.log('Voice input');
  };

  return (
    <div className="chat-input-container">
      <div className="chat-input-wrapper">
        <button className="input-action-btn" onClick={handleAttach}>
          <Paperclip />
        </button>

        <div className="input-area">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="输入消息..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        </div>

        <button className="input-action-btn" onClick={handleVoice}>
          <VideoCamera />
        </button>

        {isLoading ? (
          <button className="send-btn loading" onClick={onStop}>
            <Loading className="is-loading" />
          </button>
        ) : (
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <Promotion />
          </button>
        )}
      </div>

      <div className="input-hint">
        <ElSelect modelValue="sonnet-4" size="small" placeholder="选择模型">
          <ElOption label="Sonnet 4" value="sonnet-4" />
          <ElOption label="Sonnet 4.6" value="sonnet-4-6" />
          <ElOption label="Opus 4" value="opus-4" />
        </ElSelect>
      </div>
    </div>
  );
};
```

**Step 5: 创建 ChatInput.css**

Create `src/renderer/components/Chat/ChatInput.css`:

```css
.chat-input-container {
  padding: 16px 24px 24px;
  background-color: var(--bg-primary);
}

.chat-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.input-action-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.input-action-btn:hover {
  background-color: var(--hover-bg);
  color: var(--text-primary);
}

.input-area {
  flex: 1;
  min-width: 0;
}

.chat-textarea {
  width: 100%;
  min-height: 24px;
  max-height: 200px;
  padding: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-primary);
  background: transparent;
  resize: none;
  overflow-y: auto;
}

.chat-textarea::placeholder {
  color: var(--text-secondary);
}

.send-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--text-primary);
  color: var(--bg-card);
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn.loading {
  background-color: var(--color-error);
}

.is-loading {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.input-hint {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.input-hint .el-select {
  width: 140px;
}
```

**Step 6: 创建 QuickActions.tsx**

Create `src/renderer/components/Chat/QuickActions.tsx`:

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../stores/chatStore';
import './QuickActions.css';

interface QuickAction {
  icon: string;
  label: string;
  prompt: string;
}

const quickActions: QuickAction[] = [
  { icon: '💻', label: '代码', prompt: '帮我写代码' },
  { icon: '📝', label: '写作', prompt: '帮我写作' },
  { icon: '✨', label: '创建', prompt: '帮我创建一个项目' },
  { icon: '📖', label: '学习', prompt: '我想学习' },
  { icon: '🌿', label: '生活', prompt: '帮我解决生活问题' },
];

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const createThread = useChatStore((state) => state.createThread);
  const addMessage = useChatStore((state) => state.addMessage);

  const handleAction = (action: QuickAction) => {
    const thread = createThread(action.label);
    addMessage(thread.id, {
      id: Math.random().toString(36).substring(2),
      role: 'user',
      content: action.prompt,
      timestamp: Date.now(),
    });
    navigate(`/chat/${thread.id}`);
  };

  return (
    <div className="quick-actions">
      {quickActions.map((action) => (
        <button
          key={action.label}
          className="quick-action-btn"
          onClick={() => handleAction(action)}
        >
          <span className="action-icon">{action.icon}</span>
          <span className="action-label">{action.label}</span>
        </button>
      ))}
    </div>
  );
};
```

**Step 7: 创建 QuickActions.css**

Create `src/renderer/components/Chat/QuickActions.css`:

```css
.quick-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 24px;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  font-size: 14px;
  color: var(--text-primary);
  transition: all 0.15s ease;
}

.quick-action-btn:hover {
  background-color: var(--hover-bg);
  border-color: var(--text-secondary);
}

.action-icon {
  font-size: 16px;
}

.action-label {
  font-weight: 500;
}
```

**Step 8: 创建 Chat.css**

Create `src/renderer/components/Chat/Chat.css`:

```css
.chat-area {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
}

.chat-empty {
  justify-content: center;
  align-items: center;
}

.empty-state {
  text-align: center;
  padding: 24px;
}

.empty-state h2 {
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 16px;
  color: var(--text-secondary);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}
```

**Step 9: Commit**

```bash
cd D:/Agent/auto-shell
git add src/renderer/components/Chat/
git commit -m "feat(chat): create chat components (ChatArea, ChatMessage, ChatInput, QuickActions)"
```

---

## Task 7: 创建页面组件

**Files:**
- Create: `src/renderer/pages/Home.tsx`
- Create: `src/renderer/pages/ChatPage.tsx`
- Create: `src/renderer/pages/KnowledgePage.tsx`
- Create: `src/renderer/pages/SkillsPage.tsx`
- Create: `src/renderer/pages/ProjectsPage.tsx`
- Create: `src/renderer/pages/ArtifactsPage.tsx`
- Create: `src/renderer/pages/SettingsPage.tsx`

**Step 1: 创建 Home.tsx**

Create `src/renderer/pages/Home.tsx`:

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../stores/chatStore';
import { QuickActions } from '../components/Chat/QuickActions';
import './Home.css';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const createThread = useChatStore((state) => state.createThread);

  const handleNewChat = () => {
    const thread = createThread();
    navigate(`/chat/${thread.id}`);
  };

  return (
    <div className="home-page">
      <div className="home-content">
        <h1 className="home-title">你好，jelly</h1>
        <p className="home-subtitle">有什么可以帮助你的吗？</p>
        <QuickActions />
      </div>
    </div>
  );
};
```

**Step 2: 创建 Home.css**

Create `src/renderer/pages/Home.css`:

```css
.home-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-primary);
}

.home-content {
  text-align: center;
  padding: 24px;
}

.home-title {
  font-size: 36px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.home-subtitle {
  font-size: 18px;
  color: var(--text-secondary);
}
```

**Step 3: 创建 ChatPage.tsx**

Create `src/renderer/pages/ChatPage.tsx`:

```tsx
import React from 'react';
import { ChatArea } from '../components/Chat/ChatArea';

export const ChatPage: React.FC = () => {
  return <ChatArea />;
};
```

**Step 4: 创建 KnowledgePage.tsx**

Create `src/renderer/pages/KnowledgePage.tsx`:

```tsx
import React from 'react';
import { Header } from '../components/common/Header';
import './KnowledgePage.css';

export const KnowledgePage: React.FC = () => {
  return (
    <div className="knowledge-page">
      <Header title="知识库" showNav={false} />
      <div className="page-content">
        <div className="knowledge-empty">
          <p>上传文档构建知识库</p>
          <button className="upload-btn">上传文档</button>
        </div>
      </div>
    </div>
  );
};
```

**Step 5: 创建 SkillsPage.tsx**

Create `src/renderer/pages/SkillsPage.tsx`:

```tsx
import React from 'react';
import { Header } from '../components/common/Header';
import './SkillsPage.css';

export const SkillsPage: React.FC = () => {
  return (
    <div className="skills-page">
      <Header title="技能市场" showNav={false} />
      <div className="page-content">
        <div className="skills-grid">
          <div className="skill-card">
            <div className="skill-icon">🛠️</div>
            <h3>代码助手</h3>
            <p>帮你写代码、调试、审查代码</p>
          </div>
          <div className="skill-card">
            <div className="skill-icon">📝</div>
            <h3>写作助手</h3>
            <p>帮你写作、翻译、润色文章</p>
          </div>
          <div className="skill-card">
            <div className="skill-icon">🔍</div>
            <h3>搜索助手</h3>
            <p>帮你搜索信息、分析数据</p>
          </div>
        </div>
      </div>
    </div>
  );
};
```

**Step 6: 创建 ProjectsPage.tsx**

Create `src/renderer/pages/ProjectsPage.tsx`:

```tsx
import React from 'react';
import { Header } from '../components/common/Header';
import './ProjectsPage.css';

export const ProjectsPage: React.FC = () => {
  return (
    <div className="projects-page">
      <Header title="项目" showNav={false} />
      <div className="page-content">
        <div className="projects-empty">
          <p>创建项目组织你的工作</p>
          <button className="create-btn">新建项目</button>
        </div>
      </div>
    </div>
  );
};
```

**Step 7: 创建 ArtifactsPage.tsx**

Create `src/renderer/pages/ArtifactsPage.tsx`:

```tsx
import React from 'react';
import { Header } from '../components/common/Header';
import './ArtifactsPage.css';

export const ArtifactsPage: React.FC = () => {
  return (
    <div className="artifacts-page">
      <Header title="生成物" showNav={false} />
      <div className="page-content">
        <div className="artifacts-empty">
          <p>AI 生成的内容会保存在这里</p>
        </div>
      </div>
    </div>
  );
};
```

**Step 8: 创建 SettingsPage.tsx**

Create `src/renderer/pages/SettingsPage.tsx`:

```tsx
import React, { useState } from 'react';
import { Header } from '../components/common/Header';
import { useAppStore } from '../stores/appStore';
import { ElSwitch, ElSelect, ElOption } from 'element-plus';
import type { PermissionMode } from '../../shared/types';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const { permissionEnabled, permissionMode, togglePermission, setPermissionMode } = useAppStore();

  return (
    <div className="settings-page">
      <Header title="设置" showNav={false} />
      <div className="settings-content">
        <section className="settings-section">
          <h3>权限设置</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">权限模式</span>
              <span className="setting-desc">启用后，AI 执行操作需要确认</span>
            </div>
            <ElSwitch
              modelValue={permissionEnabled}
              onChange={togglePermission}
            />
          </div>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">默认权限</span>
              <span className="setting-desc">选择默认的权限级别</span>
            </div>
            <ElSelect
              modelValue={permissionMode}
              onChange={(val) => setPermissionMode(val as PermissionMode)}
              disabled={permissionEnabled}
            >
              <ElOption label="默认询问" value="default" />
              <ElOption label="自动批准" value="acceptEdits" />
              <ElOption label="跳过确认" value="bypassPermissions" />
              <ElOption label="计划模式" value="plan" />
            </ElSelect>
          </div>
        </section>

        <section className="settings-section">
          <h3>关于</h3>
          <div className="setting-item">
            <span className="setting-label">版本</span>
            <span className="setting-value">0.3.0</span>
          </div>
        </section>
      </div>
    </div>
  );
};
```

**Step 9: 创建通用页面样式**

Create `src/renderer/pages/page.css`:

```css
.knowledge-page,
.skills-page,
.projects-page,
.artifacts-page,
.settings-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
}

.page-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.knowledge-empty,
.projects-empty,
.artifacts-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
}

.upload-btn,
.create-btn {
  padding: 10px 24px;
  background-color: var(--text-primary);
  color: var(--bg-card);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.skill-card {
  padding: 24px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: all 0.15s ease;
}

.skill-card:hover {
  border-color: var(--text-secondary);
}

.skill-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.skill-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.skill-card p {
  font-size: 14px;
  color: var(--text-secondary);
}

.settings-content {
  padding: 24px;
  max-width: 600px;
}

.settings-section {
  margin-bottom: 32px;
}

.settings-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
}

.setting-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.setting-value {
  font-size: 14px;
  color: var(--text-secondary);
}
```

**Step 10: Commit**

```bash
cd D:/Agent/auto-shell
git add src/renderer/pages/
git commit -m "feat(pages): create all page components"
```

---

## Task 8: 配置路由和根组件

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/main.tsx`

**Step 1: 更新 App.tsx**

Modify `src/renderer/App.tsx`:

```tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Home } from './pages/Home';
import { ChatPage } from './pages/ChatPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { SkillsPage } from './pages/SkillsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ArtifactsPage } from './pages/ArtifactsPage';
import { SettingsPage } from './pages/SettingsPage';
import './styles/global.css';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chat/:threadId" element={<ChatPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/artifacts" element={<ArtifactsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
```

**Step 2: 更新 App.css**

Create `src/renderer/App.css`:

```css
.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

**Step 3: 更新 main.tsx**

Modify `src/renderer/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'element-plus/dist/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 4: Commit**

```bash
cd D:/Agent/auto-shell
git add src/renderer/App.tsx src/renderer/App.css src/renderer/main.tsx
git commit -m "feat(router): configure react-router-dom routes and main layout"
```

---

## Task 9: 验证构建

**Step 1: 运行构建**

Run: `cd D:/Agent/auto-shell && npm run build`
Expected: 构建成功，无错误

**Step 2: 运行开发服务器**

Run: `cd D:/Agent/auto-shell && npm run dev`
Expected: 开发服务器启动，无报错

**Step 3: Commit**

```bash
cd D:/Agent/auto-shell
git add .
git commit -m "chore: verify build and dev server work correctly"
```

---

## 实施完成总结

### 新增文件

```
src/
├── renderer/
│   ├── components/
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Sidebar.css
│   │   │   ├── SidebarMenu.tsx
│   │   │   ├── SidebarMenu.css
│   │   │   ├── RecentThreads.tsx
│   │   │   ├── RecentThreads.css
│   │   │   ├── UserProfile.tsx
│   │   │   └── UserProfile.css
│   │   ├── Chat/
│   │   │   ├── ChatArea.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatMessage.css
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ChatInput.css
│   │   │   ├── QuickActions.tsx
│   │   │   ├── QuickActions.css
│   │   │   └── Chat.css
│   │   └── common/
│   │       ├── Header.tsx
│   │       └── Header.css
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Home.css
│   │   ├── ChatPage.tsx
│   │   ├── KnowledgePage.tsx
│   │   ├── SkillsPage.tsx
│   │   ├── ProjectsPage.tsx
│   │   ├── ArtifactsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── page.css
│   ├── stores/
│   │   ├── appStore.ts
│   │   ├── chatStore.ts
│   │   └── userStore.ts
│   ├── styles/
│   │   ├── variables.css
│   │   └── global.css
│   ├── App.tsx
│   └── App.css
└── shared/
    └── types/
        └── index.ts
```

### 修改文件

```
package.json      # 添加依赖
src/renderer/main.tsx  # 添加 Element Plus CSS
```

### 安装的依赖

```bash
npm install element-plus @element-plus/icons-vue react-router-dom
```

---

## 下一步

设计文档: `docs/plans/2026-04-06-unified-ai-client-design.md`
实施计划: `docs/plans/2026-04-06-unified-ai-client-implementation.md`

**两个执行选项:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
