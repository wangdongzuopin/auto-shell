# Contributing

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Project shape

- `src/main/`: Electron main process and PTY runtime
- `src/preload.ts`: safe renderer bridge
- `src/renderer/`: desktop UI
- `src/ai/`: model provider abstraction and implementations
- `src/tools/`: AI tool contracts and built-in tools

## Contribution guidelines

- Keep provider-specific logic inside `src/ai/`.
- Keep shell lifecycle logic inside `src/main/pty-manager.ts`.
- Prefer adding new capabilities through `src/tools/` contracts instead of wiring feature logic directly into UI components.
- For user-facing features, include a short note in `README.md` or `docs/`.
- For Windows shell changes, test at least PowerShell and CMD startup.

## Product direction

The target is not just an Electron demo. The target is an open source, Windows-first AI terminal product with:

- reliable shell behavior
- low-friction AI configuration
- clear extension boundaries
- contributor-friendly architecture
