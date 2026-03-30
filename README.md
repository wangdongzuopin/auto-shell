# Auto Shell

An AI-powered terminal emulator for Windows, built with Electron.

## Features

- **Terminal Emulation**: Full-featured terminal using xterm.js with web links and fit addon
- **Multi-tab Sessions**: Manage multiple terminal sessions with tabbed interface
- **AI Integration**: Connect to multiple AI providers for command explanation and assistance
  - Claude (Anthropic)
  - OpenAI
  - Ollama
  - MiniMax
- **Command Explanation**: Select text in terminal to get AI-powered explanations via ExplainTooltip
- **Quick Commands**: Save and execute predefined commands quickly
- **Theme Support**: Multiple theme options with light/dark mode
- **Session Persistence**: Sessions are saved and restored across app restarts
- **Toast Notifications**: Non-intrusive notification system for user feedback

## Tech Stack

- **Framework**: Electron + Electron Vite
- **Frontend**: React 18 + TypeScript
- **Terminal**: xterm.js (@xterm/xterm, @xterm/addon-fit, @xterm/addon-web-links)
- **State Management**: Zustand
- **AI Providers**: Custom provider abstraction supporting Claude, OpenAI, Ollama, MiniMax
- **Storage**: electron-store for persistence, keytar for secure credential storage

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Package as Windows installer
npm run package
```

## Project Structure

```
src/
├── ai/                    # AI provider integrations
│   ├── claude-provider.ts
│   ├── minimax-provider.ts
│   ├── ollama-provider.ts
│   ├── openai-provider.ts
│   ├── provider.ts        # Base provider interface
│   └── prompts.ts         # AI prompt templates
├── main/                  # Electron main process
│   ├── index.ts           # Main entry point
│   ├── ipc-handlers.ts    # IPC communication handlers
│   ├── pty-manager.ts     # PTY (pseudo-terminal) management
│   └── session-store.ts    # Session persistence
├── preload.ts             # Preload scripts for secure IPC
├── renderer/              # React frontend
│   ├── components/
│   │   ├── AIChatPanel/   # AI chat interface
│   │   ├── AICard/        # AI provider card component
│   │   ├── ExplainTooltip/# Command explanation tooltip
│   │   ├── QuickCommands/ # Quick commands panel
│   │   ├── Settings/      # Settings panels (AI, themes, features)
│   │   ├── TabBar/        # Tab navigation
│   │   ├── Terminal/      # Terminal component
│   │   ├── TitleBar/      # Custom title bar
│   │   └── Toast.tsx      # Toast notification component
│   ├── hooks/             # Custom React hooks (useAI, useTerminal, useTheme)
│   ├── store/             # Zustand stores (AI, settings, tabs)
│   ├── styles/            # Global CSS styles
│   ├── App.tsx            # Main App component
│   └── index.tsx          # Renderer entry point
└── shared/                # Shared types and IPC channels
    ├── ipc-channels.ts
    └── types.ts
```

## Sponsor

如果你觉得这个项目对你有帮助，可以扫码赞助：

### 微信支付

![微信支付](wechat-pay-qr.jpg)

### 支付宝

![支付宝](alipay-qr.jpg)

## License

MIT
