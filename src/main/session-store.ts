import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type {
  AppearanceSettings,
  AppConfig,
  FeatureToggles,
  ModelConfig,
  ProviderConfigs,
  ProviderSettings,
  ProviderType,
  TerminalSession,
  TerminalTabState,
  Theme
} from '../shared/types';

interface PersistedConfig {
  provider: ProviderType;
  providerConfigs: ProviderConfigs;
  aiFeatures: FeatureToggles;
  theme: Theme;
  apiKeys: Partial<Record<ProviderType, string>>;
  currentModel: string;
  modelConfig: ModelConfig;
  terminalSession: TerminalSession;
  appearance: AppearanceSettings;
}

const CONFIG_DIR = path.join(os.homedir(), '.autoshell');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const MAX_HISTORY_PER_DIRECTORY = 20;

const defaultProviderConfigs: ProviderConfigs = {
  minimax: {
    baseUrl: 'https://api.minimaxi.com/anthropic',
    model: 'MiniMax-M2.7'
  },
  glm: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4.5'
  },
  claude: {
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-7-sonnet-latest'
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini'
  },
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:7b'
  },
  openaiCompatible: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini'
  }
};

const defaultTheme: Theme = {
  name: 'Auto Shell Dark',
  background: '#0f1115',
  foreground: '#d8dee9',
  accent: '#4c8dff'
};

const defaultFeatures: FeatureToggles = {
  errorCard: true,
  naturalCommand: true,
  explainCommand: true,
  completion: false
};

const defaultConfig: PersistedConfig = {
  provider: 'minimax',
  providerConfigs: defaultProviderConfigs,
  aiFeatures: defaultFeatures,
  theme: defaultTheme,
  apiKeys: {},
  currentModel: 'MiniMax-M2.7',
  modelConfig: {},
  terminalSession: {
    tabs: [],
    activeTabId: null,
    commandHistoryByCwd: {}
  },
  appearance: {
    terminalTransparency: false,
    terminalOpacity: 0.7,
    terminalBackdrop: false
  }
};

function normalizeProviderConfig(provider: ProviderType, config: ProviderSettings): ProviderSettings {
  if (provider === 'minimax' && config.baseUrl === 'https://api.minimaxi.com/v1') {
    return {
      ...config,
      baseUrl: 'https://api.minimaxi.com/anthropic'
    };
  }

  return config;
}

function ensureConfigDir(): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function normalizePersistedConfig(input?: Partial<PersistedConfig>): PersistedConfig {
  const providerConfigs = {
    ...defaultProviderConfigs,
    ...(input?.providerConfigs ?? {})
  };

  const normalizedProviderConfigs = Object.fromEntries(
    Object.entries(providerConfigs).map(([providerName, providerConfig]) => [
      providerName,
      normalizeProviderConfig(providerName as ProviderType, providerConfig as ProviderSettings)
    ])
  ) as ProviderConfigs;

  return {
    provider: input?.provider ?? defaultConfig.provider,
    providerConfigs: normalizedProviderConfigs,
    aiFeatures: {
      ...defaultFeatures,
      ...(input?.aiFeatures ?? {})
    },
    theme: {
      ...defaultTheme,
      ...(input?.theme ?? {})
    },
    apiKeys: input?.apiKeys ?? {},
    currentModel: input?.currentModel ?? defaultConfig.currentModel,
    modelConfig: input?.modelConfig ?? defaultConfig.modelConfig,
    terminalSession: normalizeTerminalSession(input?.terminalSession),
    appearance: {
      ...defaultConfig.appearance,
      ...(input?.appearance ?? {})
    }
  };
}

function normalizeTerminalSession(input?: Partial<TerminalSession>): TerminalSession {
  const tabs = Array.isArray(input?.tabs)
    ? input.tabs
        .map(normalizeTabSnapshot)
        .filter((tab): tab is TerminalTabState => Boolean(tab))
    : [];

  const activeTabId =
    typeof input?.activeTabId === 'string' && tabs.some((tab) => tab.id === input.activeTabId)
      ? input.activeTabId
      : tabs[0]?.id ?? null;

  const commandHistoryByCwd = Object.fromEntries(
    Object.entries(input?.commandHistoryByCwd ?? {}).flatMap(([cwd, commands]) => {
      if (typeof cwd !== 'string' || !cwd.trim() || !Array.isArray(commands)) {
        return [];
      }

      const normalizedCommands = commands
        .filter((command): command is string => typeof command === 'string')
        .map((command) => command.trim())
        .filter(Boolean)
        .slice(0, MAX_HISTORY_PER_DIRECTORY);

      return normalizedCommands.length > 0 ? [[cwd, normalizedCommands]] : [];
    })
  );

  return {
    tabs,
    activeTabId,
    commandHistoryByCwd
  };
}

function normalizeTabSnapshot(tab: unknown): TerminalTabState | null {
  if (!tab || typeof tab !== 'object') {
    return null;
  }

  const value = tab as Partial<TerminalTabState>;
  if (!value.id || !value.name || !value.shell) {
    return null;
  }

  return {
    id: String(value.id),
    name: String(value.name),
    shell: String(value.shell),
    cwd: typeof value.cwd === 'string' && value.cwd.trim() ? value.cwd : '~'
  };
}

function writePersistedConfig(config: PersistedConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function readPersistedConfig(): PersistedConfig {
  ensureConfigDir();

  if (!fs.existsSync(CONFIG_PATH)) {
    writePersistedConfig(defaultConfig);
    return defaultConfig;
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedConfig>;
    const normalized = normalizePersistedConfig(parsed);
    writePersistedConfig(normalized);
    return normalized;
  } catch (error) {
    console.error('Failed to read Auto Shell config, resetting:', error);
    writePersistedConfig(defaultConfig);
    return defaultConfig;
  }
}

function updatePersistedConfig(
  updater: (current: PersistedConfig) => PersistedConfig
): PersistedConfig {
  const nextConfig = normalizePersistedConfig(updater(readPersistedConfig()));
  writePersistedConfig(nextConfig);
  return nextConfig;
}

export async function saveApiKey(provider: ProviderType, key: string): Promise<void> {
  updatePersistedConfig((current) => ({
    ...current,
    apiKeys: {
      ...current.apiKeys,
      [provider]: key
    }
  }));
}

export async function getApiKey(provider: ProviderType): Promise<string | null> {
  return readPersistedConfig().apiKeys[provider] ?? null;
}

export function getConfig(): AppConfig {
  const persisted = readPersistedConfig();

  return {
    provider: persisted.provider,
    providerConfig: persisted.providerConfigs[persisted.provider],
    providerConfigs: persisted.providerConfigs,
    aiFeatures: persisted.aiFeatures,
    theme: persisted.theme,
    currentModel: persisted.currentModel,
    modelConfig: persisted.modelConfig
  };
}

export function setProvider(provider: ProviderType) {
  updatePersistedConfig((current) => ({
    ...current,
    provider
  }));
}

export function setProviderConfig(provider: ProviderType, config: ProviderSettings) {
  updatePersistedConfig((current) => ({
    ...current,
    providerConfigs: {
      ...current.providerConfigs,
      [provider]: normalizeProviderConfig(provider, config)
    }
  }));
}

export function setTheme(theme: Theme) {
  updatePersistedConfig((current) => ({
    ...current,
    theme
  }));
}

export function setFeatures(features: FeatureToggles) {
  updatePersistedConfig((current) => ({
    ...current,
    aiFeatures: features
  }));
}

export function getTerminalSession(): TerminalSession {
  return readPersistedConfig().terminalSession;
}

export function saveTerminalSession(session: TerminalSession) {
  updatePersistedConfig((current) => ({
    ...current,
    terminalSession: normalizeTerminalSession(session)
  }));
}

export function getAppearance(): AppearanceSettings {
  return readPersistedConfig().appearance;
}

export function setAppearance(appearance: AppearanceSettings) {
  updatePersistedConfig((current) => ({
    ...current,
    appearance
  }));
}

export function recordTerminalCommand(cwd: string, command: string) {
  const normalizedCwd = normalizeCwdKey(cwd);
  const normalizedCommand = command.trim();

  if (!normalizedCommand) {
    return;
  }

  updatePersistedConfig((current) => {
    const existing = current.terminalSession.commandHistoryByCwd[normalizedCwd] ?? [];
    const nextHistory = [normalizedCommand, ...existing.filter((item) => item !== normalizedCommand)]
      .slice(0, MAX_HISTORY_PER_DIRECTORY);

    return {
      ...current,
      terminalSession: {
        ...current.terminalSession,
        commandHistoryByCwd: {
          ...current.terminalSession.commandHistoryByCwd,
          [normalizedCwd]: nextHistory
        }
      }
    };
  });
}

function normalizeCwdKey(cwd: string): string {
  return cwd?.trim() || '~';
}

export { CONFIG_DIR, CONFIG_PATH, defaultProviderConfigs };
