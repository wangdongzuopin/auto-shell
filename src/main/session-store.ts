import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type {
  AppConfig,
  FeatureToggles,
  ProviderConfigs,
  ProviderSettings,
  ProviderType,
  Theme
} from '../shared/types';

interface PersistedConfig {
  provider: ProviderType;
  providerConfigs: ProviderConfigs;
  aiFeatures: FeatureToggles;
  theme: Theme;
  apiKeys: Partial<Record<ProviderType, string>>;
}

const CONFIG_DIR = path.join(os.homedir(), '.autoshell');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

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
  apiKeys: {}
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
    apiKeys: input?.apiKeys ?? {}
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
    theme: persisted.theme
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

export { CONFIG_DIR, CONFIG_PATH, defaultProviderConfigs };
