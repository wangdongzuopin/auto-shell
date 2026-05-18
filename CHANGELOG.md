# Changelog

All notable changes to pizz will be documented in this file.

## [0.1.0] — Unreleased

### Added
- Multi-vendor AI chat with streaming (DeepSeek, Zhipu GLM, Kimi, MiniMax, Doubao, Tongyi, Stepfun, SiliconFlow, OpenAI-compatible, Anthropic)
- Tool calling system with 15 built-in tools (read/write files, grep search, apply patch, run command, git operations, knowledge base, skills)
- Dual-role system: Developer mode (code Q&A + editing) and Product Manager mode (PRD writing, competitive analysis)
- AI skill system with customizable prompts, 10 built-in skill sets
- Project file management with folder import and SQLite FTS5 full-text search
- Diff tracking with checkpoint/undo support
- Knowledge base with persistent entries and search
- Conversation export (Markdown / HTML)
- MCP (Model Context Protocol) client with multi-server support
- Terminal integration (PTY with output capture)
- Git integration (status, diff, log, commit suggestions)
- Team workflow system (Workspaces → Ideas → Assessment → PRD → Dev Tasks → QA)
- i18n framework with Chinese and English support
- Onboarding flow for first-time setup
- Command palette (Ctrl+K)
- Settings page for AI provider configuration
- Dark / Light theme support
- Encrypted API key storage via OS credential manager (AES-256-GCM)

### Changed
- Rewrote from Electron to Tauri v2 with Rust backend
- Migrated to Tailwind CSS v4 with design tokens
- Adopted Zustand for state management

---

<details>
<summary>中文版 (Chinese)</summary>

## 更新日志

## [0.1.0] — 未发布

### 新增
- 多供应商 AI 聊天与流式传输（DeepSeek、智谱 GLM、Kimi、MiniMax、豆包、通义千问、阶跃星辰、硅基流动、OpenAI 兼容、Anthropic）
- 工具调用系统，内置 15 个工具（读写文件、grep 搜索、apply patch、运行命令、Git 操作、知识库、技能）
- 双角色系统：开发者模式（代码问答+编辑）和产品经理模式（PRD 撰写、竞品分析）
- AI 技能系统，可自定义提示词，内置 10 套技能
- 项目管理与 SQLite FTS5 全文搜索
- Diff 追踪与 checkpoint/undo 支持
- 知识库持久化存储与搜索
- 对话导出（Markdown / HTML）
- MCP 协议客户端，支持多服务器
- 终端集成（PTY + 输出捕获）
- Git 集成（状态、diff、日志、提交建议）
- 团队工作流系统（工作区 → 想法 → 评估 → PRD → 开发任务 → 测试）
- 中英文国际化框架
- 首次引导流程
- 命令面板（Ctrl+K）
- AI 供应商配置页面
- 暗色/亮色主题
- 基于 OS 凭据管理器的加密 API Key 存储（AES-256-GCM）

### 变更
- 从 Electron 重写为 Tauri v2 + Rust 后端
- 迁移至 Tailwind CSS v4 + 设计令牌
- 采用 Zustand 状态管理

</details>
