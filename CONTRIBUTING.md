# Contributing to pizz

**pizz** is an AI workstation for independent full-stack developers. We welcome contributions that make solo development more productive.

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.75+
- pnpm
- Windows 10+ / macOS 12+ / Linux

### Setup

```bash
git clone https://github.com/pizz-sh/pizz.git
cd pizz
pnpm install
pnpm dev
```

### Project Structure

```
pizz/
├── src/               # Frontend (React + TypeScript)
│   ├── components/     # UI components
│   ├── pages/          # Route pages
│   ├── stores/         # Zustand state
│   ├── services/       # AI service layer
│   └── lib/            # Utilities
├── src-tauri/          # Backend (Rust)
│   ├── src/
│   │   ├── commands/   # Tauri IPC commands
│   │   ├── db/         # Database repositories
│   │   ├── models/     # Data models
│   │   ├── ai/         # AI providers & streaming
│   │   ├── tools/      # AI tool definitions & execution
│   │   ├── mcp/        # MCP client & manager
│   │   ├── indexing/   # File indexer & watcher
│   │   └── terminal/   # Terminal integration
│   └── migrations/     # SQLite migrations
└── docx/               # Product documentation
```

## Development Workflow

### Branching

- `main` — stable, releasable
- `feature/<name>` — new features
- `fix/<name>` — bug fixes

### Commit Style

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add tool calling streaming
fix: resolve path traversal in read_file
refactor: extract security validation
test: add git commit suggestion tests
docs: update README with setup guide
```

### Before Submitting a PR

1. **Tests pass** — `cargo test` (Rust) and `pnpm test` (frontend)
2. **Type check** — `pnpm exec tsc` has zero errors
3. **Format** — `cargo fmt` and `pnpm prettier --write .`
4. **Lint** — `cargo clippy -- -D warnings`
5. **New code has tests** — target 80% coverage on changed files

### Running Checks

```bash
# Rust
cd src-tauri
cargo test
cargo fmt --check
cargo clippy -- -D warnings

# Frontend
pnpm test
pnpm exec tsc
pnpm prettier --check src/
```

## Where to Contribute

### Good First Issues

- Add tests for untested modules
- Improve error messages and hints
- Add i18n translations
- Fix minor UI edge cases

### Feature Ideas

- Additional AI provider integrations
- New skill system templates
- CLI companion tool
- VS Code extension

## Security

**Never commit API keys or secrets.** If you discover a security vulnerability, please report it privately — do not open a public issue.

---

<details>
<summary>中文版 (Chinese)</summary>

## 参与贡献 pizz

**pizz** 是面向独立全栈开发者的 AI 工作站。欢迎任何能提升独立开发效率的贡献。

### 环境准备

- Node.js 18+
- Rust 1.75+
- pnpm
- Windows 10+ / macOS 12+ / Linux

### 开发流程

1. **测试通过** — `cargo test` (Rust) 和 `pnpm test` (前端)
2. **类型检查** — `pnpm exec tsc` 零错误
3. **格式化** — `cargo fmt` 和 `pnpm prettier --write .`
4. **Lint** — `cargo clippy -- -D warnings`
5. **新代码有测试** — 变更文件测试覆盖率目标 80%

### 提交信息格式

遵循 Conventional Commits 规范：

```
feat: 添加工具调用流式传输
fix: 修复读文件路径遍历
refactor: 提取安全校验模块
test: 添加 git 提交建议测试
```

### 贡献方向

- 为未测试模块编写测试
- 改进错误提示信息
- 添加国际化翻译
- 新增 AI 供应商集成
- CLI 辅助工具
- VS Code 扩展

### 安全

**切勿提交 API 密钥或机密信息。** 如发现安全漏洞，请私下报告，勿公开提 Issue。

</details>
