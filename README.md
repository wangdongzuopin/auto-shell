# pizz

**pizz** —— 个人全栈开发者的 AI 工作站。

面向独立开发者的一体化 AI 编程助手。支持多供应商（DeepSeek、智谱、通义千问、MiniMax 等 8+ 国内供应商 + OpenAI + Anthropic），双角色 AI 协作（开发者 + 产品经理），集成项目文件管理、知识库、AI 技能系统和文件变更追踪。

## 核心功能

- **AI 聊天 + 工具调用** —— 基于项目上下文的 AI 对话，AI 可以读取/写入文件、搜索代码、管理知识库
- **双角色系统** —— 开发者模式（代码问答 + 编辑）和产品经理模式（PRD 撰写、竞品分析），不同角色有不同的提示词和 UI 主题
- **多 AI 供应商** —— 预设 8 个国内供应商（DeepSeek、智谱 GLM、Kimi、MiniMax、豆包、通义千问、阶跃星辰、硅基流动）+ OpenAI 兼容 + Anthropic
- **AI 技能系统** —— 可创建、启用/禁用、按角色分类的提示词片段，内置编码规范、安全审查、TDD、前端模式等 10 套技能
- **项目文件管理** —— 文件夹导入、文件索引（SQLite FTS5）、全文搜索
- **Diff 追踪** —— AI 文件修改自动记录，可预览变更
- **知识库** —— 持久化知识条目，全文搜索
- **对话导出** —— 产品经理模式下导出为 Markdown / HTML

## 技术栈

| 层 | 技术 |
|---|------|
| 桌面框架 | Tauri v2 |
| 前端 | React 18 + TypeScript (strict) |
| 后端 | Rust (async, tokio) |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand |
| 数据库 | SQLite (sqlx + FTS5) |
| 构建 | Vite 6 |

## 快速开始

### 环境要求

- Node.js 18+
- Rust 1.75+
- Windows 10+ / macOS 12+ / Linux

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

构建产物在 `src-tauri/target/release/` 目录。

## 项目结构

```
pizz/
├── src/                    # 前端 React + TypeScript
│   ├── components/         # UI 组件
│   ├── pages/              # 页面（ChatPage, SettingsPage）
│   ├── stores/             # Zustand 状态管理
│   ├── services/           # AI 服务、业务逻辑
│   ├── hooks/              # React hooks
│   └── lib/                # 工具函数
├── src-tauri/              # 后端 Rust
│   ├── src/
│   │   ├── commands/       # Tauri 命令处理
│   │   ├── db/             # 数据库仓库
│   │   ├── models/         # 数据模型
│   │   ├── ai/             # AI 服务（流式传输、工具循环）
│   │   ├── tools/          # AI 工具定义与执行
│   │   └── indexing/       # 文件索引
│   └── migrations/         # SQLite 迁移
├── docx/                   # 产品文档
└── .claude/                # Claude Code 技能
```

## License

目前为私有项目，开源计划请参见 [docx/开源路线图.md](docx/开源路线图.md)。
