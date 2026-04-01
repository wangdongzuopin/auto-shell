# Open Source Product Notes

This project is moving from a desktop prototype toward an open source product.

## What we are borrowing from `claude-code-rev`

- Keep the core domain interfaces small and explicit.
- Prefer extension points over hard-coded feature branches.
- Separate runtime orchestration from UI rendering.
- Make product behavior discoverable through docs, not tribal knowledge.

## How that maps here

### 1. Tool-first extension surface

`src/tools/` should remain the primary extension boundary for AI-assisted terminal actions.

- `Tool.ts`: stable contract
- `buildTool.ts`: lightweight factory for community-contributed tools
- `ToolRegistry.ts`: runtime registration and discovery

This mirrors the reference project's "build once, register everywhere" pattern without importing its full complexity.

### 2. Provider isolation

`src/ai/provider.ts` is the model abstraction boundary.

- UI components should not know vendor-specific request details.
- IPC handlers should talk to provider interfaces, not concrete providers.
- New providers should be add-only changes whenever possible.

### 3. Product-quality terminal runtime

`src/main/pty-manager.ts` is infrastructure, not feature code.

- shell startup must be resilient
- encoding must be initialized safely
- shell selection should tolerate different Windows environments

### 4. OSS-friendly expectations

Every product-facing change should try to include at least one of:

- a documented extension point
- a user-visible quality improvement
- lower setup friction
- clearer failure behavior

## Near-term roadmap

1. Replace plaintext API key storage with OS-native secure storage.
2. Add a command palette / actions registry built on top of the tool registry.
3. Add contribution docs for tools, providers, and UI modules separately.
4. Add smoke tests for PTY startup, tab switching, and provider settings.
5. Introduce a plugin loading layer only after the core contracts stabilize.
